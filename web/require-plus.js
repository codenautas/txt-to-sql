(function(){
    if(!window){
        throw new Error("require-bro is only for browser");
    }
    ['require', 'globalModuleName', 'exports'].forEach(function(name){
        if(window[name]){
            throw new Error("require-bro is incompatible here. 'window."+name+"' found");
        }
    });
    window.require = function requireBro(name){
        if(window.require.definedModules[name]){
            return window.require.definedModules[name];
        }else{
            var camelName=name.replace(/-([a-z])/g, function(match){
                return match.toUpperCase();
            }
            if(window[camelName]){
                return window[camelName];
            }else{
                camelName=camelName.substr(0,1).toUpperCase()+camelName.substr(1);
                return window[camelName];
            }
            throw new Error("require-bro: module "+JSON.stringify(name)+" not found. It must included manually");
        }
    }
    var dashedName;
    Object.defineProperty(window, 'globalModuleName',{
        get:function(){  return moduleName; },
        set:function(name){
            if(name){
                dashedName=name.substr(0,1).toLowerCase()+name.substr(1).replace(/[A-Z]/g, function(letter){
                    return '-'+letter.toLowerCase();
                });
                window.exports={};
                Object.defineProperty(window.exports, name, {
                    set: function(module){
                        window.require.definedModules[dashedName] = module;
                    }
                );
            }else{
                delete window.exports;
            }
        }
    });
})();