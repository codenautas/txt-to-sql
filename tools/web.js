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

var browserify = require('browserify');

function browserifyOutDated(moduleName, relativeModuleFileName, exposedName, outputDir) {
    var moduleDir = './node_modules/'+moduleName+'/';
    var registry='./tools/versions.json';
    var regJSON, modJSON;
    var mustUpdate = false;
    return fs.readJson(registry).then(function(json) {
        regJSON = json;
        return fs.readJson(moduleDir+'package.json');
    }).then(function(packageJson) {
        modJSON = packageJson;
        //console.log("regJSON", regJSON); console.log("packageJson", packageJson.name, packageJson.version);
        if(! (modJSON.name in regJSON) || regJSON[modJSON.name] !== modJSON.version) {
            mustUpdate = true;
            regJSON[modJSON.name] = modJSON.version;
            return fs.writeJson(registry, regJSON);
        }
    }).then(function() {
        if(mustUpdate) {
            var b = browserify();
            b.require(moduleDir+relativeModuleFileName, {expose: exposedName});
            return bundlePromise(b);            
        }
    }).then(function(bfbuf) {
        if(mustUpdate) {
            console.log("Updating to "+modJSON.name+' v.'+modJSON.version)
            return fs.writeFile(outputDir+'/'+exposedName+'.js', bfbuf);
        } else {
            console.log("No update required for "+modJSON.name);
        }
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
        return browserifyOutDated('iconv-lite', 'lib/index.js', 'iconv-lite', desDir);
    }).then(function() {
        return browserifyOutDated('buffer', 'index.js', 'buffer', desDir);
    // }).then(function() {
        // return fs.copy('./node_modules/mini-tools/lib/mini-tools.js', desDir+'/mini-tools.js');
    }).catch(function(err) {
        console.log("Error", err, err.stack);
        process.exit(1);
    });
}

generateWeb();
