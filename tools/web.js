"use strict";

var Promises = require('best-promise');
require('fs-extra');
var fs = require('fs-promise');
var Path = require('path');
var pug = require('pug');
var stylus = require('stylus');

function doStylus(str) {
    return Promises.make(function(resolve, reject) {
        stylus(str).render(function(err, css) {
           if(err) { return reject(err); }
           return resolve(css);
        });
    });
}

function processDirectory(srcDir, destDir) {
    return Promises.start(function() {
        return fs.readdir(srcDir)
    }).then(function(files) {
        return Promises.all(files.map(function(file) {
            var fullName = Path.join(srcDir, file);
            return Promises.start(function() {
                return fs.readFile(fullName,  {encoding:'utf8'});
            }).then(function(content) {
                var ext = Path.extname(file).substring(1);
                return { fullName:fullName,
                    baseName:Path.basename(file, ext),
                    ext:ext,
                    content:content
                };
            }).catch(function(err) {
                console.log("error", err)
            });
        })).then(function(files) {
            return Promises.all(files.map(function (file) {
                return Promises.start(function() {
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

function generateWeb() {
    console.log("Generating web content...");
    var desDir = './web';
    return processDirectory('./src', desDir).then(function() {
        return processDirectory('./lib', desDir);
    }).then(function() {
        return fs.copy('./node_modules/best-globals/best-globals.js', desDir+'/best-globals.js');
    }).then(function() {
        return processDirectory('./node_modules/require-bro/lib', desDir);
    }).catch(function(err) {
        console.log("Error", err);
        process.exit(1);
    });
}

generateWeb();
