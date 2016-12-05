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
    window.require = function requireBro(name){
        if(window.require.definedModules[name]){
            return window.require.definedModules[name];
        }else{
            var camelName=name.replace(/-([a-z])/g, function(match, letter){
                return letter.toUpperCase();
            }).replace(/^(.*\/)*([^./]+)(\.js)?$/, function(match, path, moduleName, extJs){
                return moduleName;
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
                        throw new Error("require-bro: module "+JSON.stringify(name)+" not found. It must included manually");
                    }
                }
            }
        }
    };
    window.require.definedModules = {};
})();