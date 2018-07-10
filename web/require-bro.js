"use strict";

var requireBro = {};

(function(){
    /*global window*/
    /* eslint no-return-assign: 0 */
    if(!window){
        throw new Error("require-bro is only for browser");
    }
    if(window.require){
        throw new Error("require-bro is incompatible here. 'window.require' found");
    }
    if(!window.define){
        window.define = function define(){
            var argPos=0;
            var name;
            var dependencies=['require'];
            var factory;
            if(argPos<arguments.length && typeof arguments[argPos] === "string"){
                name=arguments[argPos];
                argPos++;
            }else{
                name=window.globalModuleName || document.currentScript.src.replace(/.*\/([^/\.]*)(.js(\?[0-9a-zA-Z]+)?)?/,function(all,part){ return part; });
            }
            if(argPos<arguments.length && arguments[argPos] instanceof Array){
                dependencies=arguments[argPos];
                argPos++;
            }
            if(argPos<arguments.length && arguments[argPos] instanceof Function){
                factory=arguments[argPos];
                argPos++;
            }else{
                throw new Error("require-bro define miss factory Function");
            }
            var exports={};
            var createdModule = factory.apply(window, dependencies.map(function(moduleName){ 
                if(moduleName==='require'){
                    return require;
                }
                if(moduleName==='exports'){
                    return exports;
                }
                return require(moduleName) 
            }));
            window.require.definedModules[name] = window[name] = createdModule === undefined ? exports : createdModule;
        }
        window.define.amd='powered by require-bro';
    }
    window.require = function requireBro(name){
        if(window.require.definedModules[name]){
            return window.require.definedModules[name];
        }else{
            var moduleName=name.replace(/^(\.\/)?(.*\/)*([^./]+)(\.js)?$/, function(match, fromThisPath, path, moduleName, extJs){
                return moduleName;
            });
            var camelName=moduleName.replace(/-([a-z])/g, function(match, letter){
                return letter.toUpperCase();
            });
            // console.log('requireBro', name, camelName, window.selfExplain);
            if(window[camelName]){
                /* jshint -W093 */ 
                return window.require.definedModules[name] = window[camelName];
                /* jshint +W093 */ 
            }else{
                camelName=camelName.substr(0,1).toUpperCase()+camelName.substr(1);
                if(window[camelName]){
                    /* jshint -W093 */ 
                    return window.require.definedModules[name] = window[camelName];
                    /* jshint +W093 */ 
                }else{
                    camelName=camelName.toLowerCase();
                    if(window[camelName]){
                        /* jshint -W093 */ 
                        return window.require.definedModules[name] = window[camelName];
                        /* jshint +W093 */ 
                    }else{
                        camelName=moduleName;
                        if(window[camelName]){
                            /* jshint -W093 */ 
                            return window.require.definedModules[name] = window[camelName];
                            /* jshint +W093 */ 
                        }else{
                            throw new Error("require-bro: module "+JSON.stringify(name)+" not found. It must included manually");
                        }
                    }
                }
            }
        }
    };
    window.require.definedModules = {};
})();