"use strict";

require('fs-extra');
var fs = require('fs-promise');
var Path = require('path');
var pug = require('pug');
var stylus = require('stylus');

function doStylus(str) {
    return new Promise(function(resolve, reject) {
        stylus(str).render(function(err, css) {
           if(err) { return reject(err); }
           return resolve(css);
        });
    });
}

function processDirectory(srcDir, destDir, only) {
    return Promise.resolve().then(function() {
        return fs.readdir(srcDir)
    }).then(function(files) {
        return Promise.all(files.map(function(file) {
            var fullName = Path.join(srcDir, file);
            return Promise.resolve().then(function() {
                return fs.readFile(fullName,  {encoding:'utf8'});
            }).then(function(content) {
                var ext = Path.extname(file).substring(1);
                return { fullName:fullName,
                    baseName:Path.basename(file, ext),
                    ext:ext,
                    content:content
                };
            }).catch(function(err) {
                //console.log("error", err)
            });
        })).then(function(files) {
            return Promise.all(files.map(function (file) {
                return Promise.resolve().then(function() {
                    //console.log("file", file.ext)
                    if(!file || (only && only.indexOf(file.ext)==-1)) { return {skip:true}; }
                    switch(file.ext) {
                        // jade parsing
                        case 'jade': file.ext = 'html'; return { data:pug.render(file.content, {}) };
                        // stylus parsing
                        case 'styl': file.ext = 'css'; return doStylus(file.content).then(function(content){ return {data:content}}); 
                        // estos son ignorados
                        case 'pdn': return { skip:true };
                        // estos son copiados tal cual
                        default: return {};
                    }
                }).then(function(res) {
                    //console.log(file.fullName, res)
                    if(! res.skip) {
                        var destFile = Path.join(destDir, file.baseName+file.ext);
                        if(res.data) { return fs.writeFile(destFile, res.data); }
                        return fs.copy(file.fullName, destFile);
                    }
                });
            }));
        });
    });
}

function bundlePromise(browserifyObject) {
    return new Promise(function(resolve, reject) {
        browserifyObject.bundle(function(err, buf) {
           if(err) { return reject(err); }
           return resolve(buf);
        });
    });
}

function generateWeb() {
    console.log("Generating web content...");
    var desDir = './web';
    return processDirectory('./src', desDir).then(function() {
        return processDirectory('./lib', desDir, ['js']);
    }).then(function() {
        return fs.copy('./node_modules/best-globals/best-globals.js', desDir+'/best-globals.js');
    }).then(function() {
        return processDirectory('./node_modules/require-bro/lib', desDir);
    }).then(function() {
        return fs.copy('./node_modules/js-to-html/js-to-html.js', desDir+'/js-to-html.js');
    }).then(function() {
        var browserify = require('browserify');
        var b = browserify();
        b.require('./node_modules/iconv-lite/lib/index.js', {expose: 'iconv-lite'});
        return bundlePromise(b);
    }).then(function(bfbuf) {
        return fs.writeFile(desDir+'/iconv-lite.js', bfbuf);
    }).then(function() {
        var browserify = require('browserify');
        var b = browserify();
        b.require('./node_modules/buffer/index.js', {expose: 'buffer'});
        return bundlePromise(b);
    }).then(function(bfbuf) {
        return fs.writeFile(desDir+'/buffer.js', bfbuf);
    // }).then(function() {
        // return fs.copy('./node_modules/mini-tools/lib/mini-tools.js', desDir+'/mini-tools.js');
    }).catch(function(err) {
        console.log("Error", err, err.stack);
        process.exit(1);
    });
}

generateWeb();
