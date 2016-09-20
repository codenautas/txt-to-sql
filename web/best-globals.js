"use strict";
/*jshint eqnull:true */
/*jshint node:true */

(function codenautasModuleDefinition(root, name, factory) {
    /* global define */
    /* istanbul ignore next */
    if(typeof root.globalModuleName !== 'string'){
        root.globalModuleName = name;
    }
    /* istanbul ignore next */
    if(typeof exports === 'object' && typeof module === 'object'){
        module.exports = factory();
    }else if(typeof define === 'function' && define.amd){
        define(factory);
    }else if(typeof exports === 'object'){
        exports[root.globalModuleName] = factory();
    }else{
        root[root.globalModuleName] = factory();
    }
    root.globalModuleName = null;
})(/*jshint -W040 */this, 'bestGlobals', function() {
/*jshint +W040 */

/*jshint -W004 */
var bestGlobals = {};
/*jshint +W004 */

bestGlobals.coalesce=function coalesce(){
    var i=0;
    var hasNull=false;
    while(i<arguments.length && arguments[i]==null){
        hasNull=hasNull || arguments[i]===null;
        i++;
    }
    if(arguments[i] instanceof bestGlobals.coalesce.throwError){
        if(arguments[i] instanceof bestGlobals.coalesce.throwErrorIfUndefined && hasNull){
            return null;
        }else{
            throw new Error(arguments[i].message);
        }
    }
    if(i>=arguments.length){
        if(hasNull){
            return null;
        }
    }else{
        return arguments[i];
    }
};

bestGlobals.coalesce.throwError=function throwError(message){
    if(this === bestGlobals.coalesce){
        return new bestGlobals.coalesce.throwError(message);
    }else{
        this.message=message;
    }
};

bestGlobals.coalesce.throwErrorIfUndefined=function throwErrorIfUndefined(message){
    if(this === bestGlobals.coalesce){
        return new bestGlobals.coalesce.throwErrorIfUndefined(message);
    }else{
        this.message=message;
    }
};

bestGlobals.coalesce.throwErrorIfUndefined.prototype=Object.create(bestGlobals.coalesce.throwError.prototype);

function retreiveOptions(functionCallee, functionAruguments, mandatoryPositionCountingFromOne){
    if(functionAruguments.length<mandatoryPositionCountingFromOne){
        return {};
    }
    var opts = functionAruguments[mandatoryPositionCountingFromOne-1];
    if(opts instanceof functionCallee.options){
        return opts;
    }else{
        throw new Error("options must be constructed with "+functionCallee.name+".options function");
    }
}

bestGlobals.createOptionsToFunction = function createOptionsToFunction(fun, mandatoryPositionCountingFromOne){
    mandatoryPositionCountingFromOne = mandatoryPositionCountingFromOne || fun.length+1;
    fun.retreiveOptions = function retrieOptions(functionAruguments){
        return retreiveOptions(fun, functionAruguments, mandatoryPositionCountingFromOne);
    };
    fun.options = function options(opts){
        var result = Object.create(fun.options.prototype);
        /*jshint forin:false */
        for(var attr in opts){
            result[attr] = opts[attr];
        }
        /*jshint forin:true */
        return result;
    };
};

bestGlobals.isPlainObject = function isPlainObject(x){
    return typeof x==="object" && x && x.constructor === Object;
};

bestGlobals.changing = function changing(original, changes){
    var opts = bestGlobals.changing.retreiveOptions(arguments);
    if(original===null || !bestGlobals.isPlainObject(original) && !(original instanceof Error)){
        if(changes!==undefined){
            return changes;
        }else{
            return original;
        }
    }else{
        if(typeof changes!=="object"){
            throw new Error("ERROR changing object with non-object");
        }else{
            var result=original instanceof Error?original:{};
            /*jshint forin:false */
            for(var name in original){
                if(!(name in changes)){
                    result[name] = original[name];
                }else if('deletingValue' in opts && changes[name]===opts.deletingValue){
                    // empty
                }else{
                    result[name] = changing(original[name], changes[name]);
                }
            }
            for(name in changes){
                if(!(name in original)){
                    result[name] = changes[name];
                }
            }
            /*jshint forin:true */
            return result;
        }
    }
};

function npad(num, width) {
    var n=num+''; // to string
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

function addDateMethods(dt) {
    dt.toYmd = function toYmd() {
        var r = [];
        r.push(this.getFullYear());
        r.push(npad(this.getMonth()+1,2));
        r.push(npad(this.getDate(),2));
        return r.join('-');        
    };
    dt.toHms = function toHms() {
        var r = [];
        r.push(npad(this.getHours(),2));
        r.push(npad(this.getMinutes(),2));
        r.push(npad(this.getSeconds(),2));
        return r.join(':');
    };
    dt.toYmdHms = function toYmdHms() {
        return this.toYmd()+' '+this.toHms();
    };
    dt.toYmdHmsM = function toYmdHmsM() {
        return this.toYmdHms()+'.'+npad(this.getMilliseconds(),3);
    };
    dt.setDateValue = function setDateValue(dateVal) {
        if(! bestGlobals.date.isOK(dateVal)) { throw new Error('invalid date'); }
        dt.setTime(dateVal.valueOf()); 
    };
    return dt;
}

////////// date
bestGlobals.date = function date(dt) {
    if(! bestGlobals.date.isOK(dt)) { throw new Error('invalid date'); }
    var d = addDateMethods(dt);
    if(d.getHours() || d.getMinutes() || d.getSeconds() || d.getMilliseconds()) {
        throw new Error('invalid date "'+d.toDateString()+'"because it has time');
    }
    d.isRealDate = true;
    return d;
};

bestGlobals.date.isValidDate = function isValidDate(year, month, day) {
    if(year<0 || month<1 || day<0) { return false; } 
    month -= 1;
    var d = new Date(year, month, day);
    return d.getFullYear()===year && d.getMonth()===month && d.getDate()===day;
 };

bestGlobals.date.isOK = function isOK(dt) {
    if(! (dt instanceof Date) ||
       isNaN(dt.getTime()) ||
       ! bestGlobals.date.isValidDate(dt.getFullYear(), dt.getMonth()+1, dt.getDate())
    ){
        return false;
    }
    return true;
};

bestGlobals.date.ymd = function ymd(y, m, d) {
    if(! bestGlobals.date.isValidDate(y, m, d)) { throw new Error('invalid date'); }
    return bestGlobals.date(new Date(y, m-1, d, 0, 0, 0, 0));
};

// var reDate = '([12][0-9]{3})([-/])(([1][0-2])|(0?[1-9]))\\3(([0123][0-9]))';
var reDate = '([0-9]+)([-/])(([1][0-2])|(0?[1-9]))\\3(([0123][0-9]))';

bestGlobals.date.parseFormat = function parseFormat(dateStr) {
    var reTz1 = ' [0-9]{2}:[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}';
    var reTz2 = 'T([0-9]{2}):[0-9]{2}:[0-9]{2}\.?[0-9]*Z';
    var re = new RegExp('^('+reDate+'('+reTz1+'|'+reTz2+')?)$');
    var match = re.exec(dateStr);
    if(! match) { throw new Error('invalid date'); }
    return { y:parseInt(match[2],10), m:parseInt(match[4],10), d:parseInt(match[7],10) };
};

bestGlobals.date.iso =  function iso(dateStr) {
    var parsed=bestGlobals.date.parseFormat(dateStr);
    return bestGlobals.date.ymd(parsed.y, parsed.m, parsed.d);
};

bestGlobals.date.array = function array(arr) {
    if(arr.length !== 3) { throw new Error('invalid date array'); }
    return bestGlobals.date.ymd(arr[0], arr[1], arr[2]);
};

/////// datetime
bestGlobals.datetime=function datetime(dt) {
    if(! bestGlobals.date.isOK(dt)) { throw new Error('invalid date'); }
    var d = addDateMethods(dt);
    d.isRealDateTime = true;
    return d;
};

bestGlobals.datetime.isValidTime = function isValidTime(h, m, s, ms) {
    if(h<0 || m<0 || s<0 || ms<0 || h>23 || m>59 || s>59 || ms>999) { return false; }
    return true;
};

bestGlobals.datetime.ymdHms = function ymdHmsM(y, m, d, hh, mm, ss) {
    return bestGlobals.datetime.ymdHmsM(y, m, d, hh, mm, ss, 0);
};

bestGlobals.datetime.ymdHmsM = function ymdHmsM(y, m, d, hh, mm, ss, ms) {
    if(! bestGlobals.date.isValidDate(y, m, d)) { throw new Error('invalid date'); }
    if(! bestGlobals.datetime.isValidTime(hh, mm, ss, ms)) { throw new Error('invalid datetime'); }
    return bestGlobals.datetime(new Date(y, m-1, d, hh, mm, ss, ms));
};

bestGlobals.datetime.parseFormat = function parseFormat(dateStr) {
    var reTz3 = ' ([0-9]{2}):([0-9]{2})(:([0-9]{2}))?(.([0-9]{3}))?';
    var re = new RegExp('^('+reDate+'('+reTz3+')?)$');
    var match = re.exec(dateStr);
    if(! match) { throw new Error('invalid datetime'); }
    // for(var p=0; p<match.length; ++p) { console.log(p, match[p]); }
    return {  y:parseInt(match[2],10), m:parseInt(match[4],10), d:parseInt(match[7],10),
             hh:parseInt(match[10]||0,10), mm:parseInt(match[11]||0,10),
             ss:parseInt(match[13]||0,10), ms:parseInt(match[15]||0,10) };
};

bestGlobals.datetime.iso = function iso(dateStr) {
    var parsed=bestGlobals.datetime.parseFormat(dateStr);
    return bestGlobals.datetime.ymdHmsM(parsed.y, parsed.m, parsed.d, parsed.hh, parsed.mm, parsed.ss, parsed.ms);
};

bestGlobals.datetime.array = function array(arr) {
    if(arr.length < 3 || arr.length>7) { throw new Error('invalid datetime array'); }
    return bestGlobals.datetime.ymdHmsM(arr[0], arr[1], arr[2], arr[3]||0, arr[4]||0, arr[5]||0, arr[6]||0);
};

bestGlobals.timeInterval = function timeInterval(time) {
    var d = new Date(0,0,0,0,0,0,0);
    d.setTime(time);
    d.toHms = function toHms() {
        var tdiff = [];
        var tm = this.getTime();
        var x = Math.abs(tm);
        x /= 1000;
        var s = Math.floor(x % 60);
        x /= 60;
        var m = Math.floor(x % 60);
        x /= 60;
        var h = Math.floor(x);
        tdiff.push((tm<0?'-':'')+(h<10?'0':'')+h);
        tdiff.push((m<10?'0':'')+m);
        tdiff.push((s<10?'0':'')+s);
        return tdiff.join(':');
    };
    return d;
};

bestGlobals.createOptionsToFunction(bestGlobals.changing);

bestGlobals.setGlobals = function setGlobals(theGlobalObj){
    /*jshint forin:false */
    for(var name in bestGlobals){
        theGlobalObj[name] = bestGlobals[name];
    }
    /*jshint forin:true */
};

bestGlobals.constructorName = function constructorName(obj) {
    if(obj){
        var cn = obj.constructor.name;
        if(!cn){
            return obj.constructor.toString().replace(/^\s*function\s*([^(]*)\((.|\s)*$/i,'$1');
        }
        return cn;
    }
};

bestGlobals.escapeRegExp = function escapeRegExp(string){
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_special_characters
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

return bestGlobals;

});