"use strict";

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
        /* eslint guard-for-in: 0 */
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

function deepCopy(object){
    var rta=object;
    if(bestGlobals.isPlainObject(object)){
        rta={};
        for(var attr in object){
            rta[attr]=deepCopy(object[attr]);
        }
    }
    if(object instanceof Array){
        rta=[];
        for(var attr in object){
            rta[attr]=deepCopy(object[attr]);
        }
    }
    return rta;
}

bestGlobals.deepCopy = deepCopy;

bestGlobals.changing = function changing(original, changes){
    var opts = bestGlobals.changing.retreiveOptions(arguments);
    if(original===null ||
        !bestGlobals.isPlainObject(original) &&
            !(original instanceof Error) &&
            (!opts.mostlyPlain || typeof original != "object" || !bestGlobals.isPlainObject(changes))
         // && !bestGlobals.changing
    ){
        if(!arguments[3]){
            throw new Error("changing with non Plain Object");
        }else if(changes!==undefined){
            return deepCopy(changes);
        }else{
            return deepCopy(original);
        }
    }else{
        if(typeof changes!=="object"){
            throw new Error("ERROR changing object with non-object");
        }else{
            var result=original instanceof Error?original:{};
            /*jshint forin:false */
            for(var name in original){
                if(!(name in changes)){
                    result[name] = deepCopy(original[name]);
                }else if('deletingValue' in opts && changes[name]===opts.deletingValue){
                    // empty
                }else{
                    result[name] = changing(original[name], changes[name], bestGlobals.changing.options(opts), true);
                }
            }
            for(name in changes){
                if(!(name in original)){
                    result[name] = deepCopy(changes[name]);
                }
            }
            /*jshint forin:true */
            return result;
        }
    }
};

bestGlobals.createOptionsToFunction(bestGlobals.changing);

function npad(num, width) {
    var n=num+''; // to string
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

var dateMethods=[
    {name: "toYmd", fun: function toYmd() {
        var r = [];
        r.push(this.getFullYear());
        r.push(npad(this.getMonth()+1,2));
        r.push(npad(this.getDate(),2));
        return r.join('-');        
    }},
    {name: "toHms", fun: function toHms() {
        var r = [];
        r.push(npad(this.getHours(),2));
        r.push(npad(this.getMinutes(),2));
        r.push(npad(this.getSeconds(),2));
        return r.join(':');
    }},
    {name: "toYmdHms", fun: function toYmdHms() {
        return this.toYmd()+' '+this.toHms();
    }},
    {name: "toYmdHmsM", fun: function toYmdHmsM() {
        return this.toYmdHms()+'.'+npad(this.getMilliseconds(),3);
    }},
    {name: "toYmdHmsMm", fun: function toYmdHmsMm() {
        return this.toYmdHms()+'.'+npad(this.getMilliseconds(),3)+npad(this.getMicroseconds(),3);
    }},
    {name: "add", fun: function add(objectOrTimeInterval){
        if(!objectOrTimeInterval.timeInterval){
            objectOrTimeInterval=bestGlobals.timeInterval(objectOrTimeInterval);
        }
        return bestGlobals.date(new Date(this.getTime()+objectOrTimeInterval.timeInterval.ms));
    }},
    {name: "sameValue", fun: function sameValue(other){
        return other && 
            other instanceof other.constructor && 
            this.getTime() == other.getTime();
    }}
]

function addDateMethods(dt) {
    dateMethods.forEach(function(funDef){
        dt[funDef.name] = funDef.fun;
    });
    return dt;
}

////////// date
bestGlobals.date = function date(dt) {
    if(! bestGlobals.date.isOK(dt)) { throw new Error('invalid date'); }
    var d = addDateMethods(new Date(dt.getTime()));
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

bestGlobals.date.iso = function iso(dateStr) {
    var parsed=bestGlobals.date.parseFormat(dateStr);
    return bestGlobals.date.ymd(parsed.y, parsed.m, parsed.d);
};

bestGlobals.date.array = function array(arr) {
    if(arr.length !== 3) { throw new Error('invalid date array'); }
    return bestGlobals.date.ymd(arr[0], arr[1], arr[2]);
};

bestGlobals.date.round = function round(timedDate){
    // var milisec = timedDate.getTime();
    // console.log('xxxxx timedDate',timedDate, timedDate.getUTCFullYear(), timedDate.getUTCMonth()+1, timedDate.getUTCDate());
    // var rawDate=new Date(milisec-milisec%(1000*60*60*24));
    // console.log('xxxxx rawDate',rawDate, rawDate.getUTCFullYear(), rawDate.getUTCMonth()+1, rawDate.getUTCDate());
    return bestGlobals.date.ymd(timedDate.getFullYear(), timedDate.getMonth()+1, timedDate.getDate());
}

bestGlobals.date.today = function today(){
    return bestGlobals.date.round(new Date());
}

/////// datetime
bestGlobals.Datetime=function Datetime(integerParts) {
    this.parts=integerParts;
    this.isRealDateTime = true;
}

addDateMethods(bestGlobals.Datetime.prototype);

bestGlobals.Datetime.reTz3 = ' ([0-9]{2}):([0-9]{2})(:([0-9]{2}))?(.([0-9]{1,6}))?';
bestGlobals.Datetime.re = new RegExp('^('+reDate+'('+bestGlobals.Datetime.reTz3+')?)$');

bestGlobals.Datetime.prototype.getFullYear     = function getFullYear()     { return this.parts.year;     };
bestGlobals.Datetime.prototype.getMonth        = function getMonth()        { return this.parts.month-1;  };
bestGlobals.Datetime.prototype.getDate         = function getDate()         { return this.parts.day;      };
bestGlobals.Datetime.prototype.getHours        = function getHours()        { return this.parts.hour;     };
bestGlobals.Datetime.prototype.getMinutes      = function getMinutes()      { return this.parts.minutes;  };
bestGlobals.Datetime.prototype.getSeconds      = function getSeconds()      { return this.parts.seconds;  };
bestGlobals.Datetime.prototype.getMilliseconds = function getMilliseconds() { return this.parts.ms;       };
bestGlobals.Datetime.prototype.getMicroseconds = function getMicroseconds() { return this.parts.micros;   };

bestGlobals.Datetime.prototype.valueOf = function getTime() { 
    return this.getTime();
}
bestGlobals.Datetime.prototype.getTime = function getTime() { 
    return new Date(
        this.parts.year   ,
        this.parts.month-1,
        this.parts.day    ,
        this.parts.hour   ,
        this.parts.minutes,
        this.parts.seconds,
        this.parts.ms     
    ).getTime();
};

bestGlobals.Datetime.prototype.toPlainString = function toPlainString(){ 
    var str=this.toYmdHmsMm();
    var prune = function(what){
        if(str.substr(str.length-what.length)==what){
            str=str.substr(0,str.length-what.length);
            return true;
        }
        return false;
    }
    prune('000') && prune('.000') && prune(':00') && prune(' 00:00');
    return str; 
}
// bestGlobals.Datetime.prototype.toUTCString = function toUTCString(){ return this.iso; }

bestGlobals.Datetime.prototype.toPostgres = function toPostgres(){
    return this.toPlainString();
}

bestGlobals.datetime={};

bestGlobals.Datetime.isValidTime = function isValidTime(h, m, s, ms, micros) {
    if(h<0 || m<0 || s<0 || ms<0 || h>23 || m>59 || s>59 || ms>999 || micros<0 || micros>999) { return false; }
    return true;
};

bestGlobals.datetime.ymdHms = function ymdHms(y, m, d, hh, mm, ss) {
    return bestGlobals.datetime.ymdHmsM(y, m, d, hh, mm, ss, 0);
};

bestGlobals.datetime.ymdHmsM = function ymdHmsM(y, m, d, hh, mm, ss, ms) {
    return bestGlobals.datetime.ymdHmsMm(y, m, d, hh, mm, ss, ms, 0)
}

bestGlobals.datetime.ymdHmsMm = function ymdHmsMm(year, month, day, hour, minutes, seconds, ms, micros){
    if(! bestGlobals.date.isValidDate(year, month, day)) { throw new Error('invalid date'); }
    if(! bestGlobals.Datetime.isValidTime(hour, minutes, seconds, ms, micros)) { throw new Error('invalid datetime'); }
    var integerParts={
        year   : year   ,
        month  : month  ,
        day    : day    ,
        hour   : hour   ,
        minutes: minutes,
        seconds: seconds,
        ms     : ms     ,
        micros : micros ,
    }
    return new bestGlobals.Datetime(integerParts);
};

bestGlobals.datetime.ms = function ms(msTicks){
    var d = new Date(msTicks);
    var integerParts={
        year   : d.getFullYear()    ,
        month  : d.getMonth()+1     ,
        day    : d.getDate()        ,
        hour   : d.getHours()       ,
        minutes: d.getMinutes()     ,
        seconds: d.getSeconds()     ,
        ms     : d.getMilliseconds(),
        micros : 0
    }
    return new bestGlobals.Datetime(integerParts);
}

bestGlobals.datetime.now = function now(){
    return bestGlobals.datetime.ms(new Date().getTime());
}

bestGlobals.datetime.iso = function iso(dateStr) {
    var match = bestGlobals.Datetime.re.exec(dateStr)
    if(match){
        var integerParts={};
        integerParts.year    = parseInt(match[2],10)
        integerParts.month   = parseInt(match[4],10)
        integerParts.day     = parseInt(match[7],10)
        integerParts.hour    = parseInt(match[10]||0,10)
        integerParts.minutes = parseInt(match[11]||0,10)
        integerParts.seconds = parseInt(match[13]||0,10)
        integerParts.ms      = parseInt(((match[15]||'0')+'000000').substr(0,3),10)
        var microPartWithoutMilliSecs = ((match[15]||'0')+'000000').substr(3);
        microPartWithoutMilliSecs+='000';
        microPartWithoutMilliSecs = microPartWithoutMilliSecs.substr(0,3);
        integerParts.micros  = parseInt(microPartWithoutMilliSecs,10);
    }else{
        throw new Error('invalid datetime');
    }
    return new bestGlobals.Datetime(integerParts)
};

bestGlobals.datetime.array = function array(arr) {
    if(arr.length < 3 || arr.length>8) { throw new Error('invalid datetime array'); }
    return bestGlobals.datetime.ymdHmsMm(arr[0], arr[1], arr[2], arr[3]||0, arr[4]||0, arr[5]||0, arr[6]||0, arr[7]||0);
};

bestGlobals.TimeInterval = function TimeInterval(timePack){
    /* istanbul ignore next */
    if(typeof timePack === 'number'){
        timePack={ms:timePack};
        console.log('|-----------------------------|');
        console.log('| DEPRECATED timeInterval(ms) |');
        console.log('|-----------------------------|');
    }
    var timeValues={
        ms     :1,
        seconds:1000,
        minutes:1000*60,
        hours  :1000*60*60,
        days   :1000*60*60*24,
    }
    var time=0;
    for(var attr in timePack){
        time+=timePack[attr]*timeValues[attr];
    }
    this.timeInterval={ms:time};
    this.toHms = function toHms(omitSeconds, withDays, omitLeftCeros) {
        var leftCero = omitLeftCeros?'':'0';
        var tm = this.timeInterval.ms;
        var prefix = (tm<0?'-':'');
        var tdiff = [];
        var x = Math.abs(tm);
        x /= 1000;
        var s = Math.floor(x % 60);
        x /= 60;
        var m = Math.floor(x % 60);
        x /= 60;
        var h = Math.floor(x);
        if(withDays){
            h = Math.floor(x % 24);
            x /= 24;
            var d = Math.floor(x);
            if(d){
                prefix+=(Math.abs(d)<10?leftCero:'')+d+'D';
                if(!h && !m && !s){
                    return prefix;
                }
                prefix+=' ';
            }
        }
        tdiff.push((h<10?leftCero:'')+h);
        tdiff.push((m<10?'0':'')+m);
        if(!omitSeconds){
            tdiff.push((s<10?'0':'')+s);
        }
        var hourPart=tdiff.join(':');
        return prefix+hourPart;
    };
    this.toHm = function toHm() {
        return this.toHms(true);
    }
    this.toPlainString = function toPlainString(){
        return this.toHms(false,true,true);
    }
    this.add = function add(objectOrTimeInterval, factor){
        if(!objectOrTimeInterval.timeInterval){
            objectOrTimeInterval=bestGlobals.timeInterval(objectOrTimeInterval);
        }
        return new bestGlobals.TimeInterval({ms:this.timeInterval.ms+objectOrTimeInterval.timeInterval.ms*(factor||1)});
    };
    this.sub = function sub(objectOrTimeInterval){
        return this.add(objectOrTimeInterval,-1);
    }
    this.getAllHours = function getAllHours(){
        return this.timeInterval.ms/(1000*60*60);
    }
    this.sameValue = function sameValue(otherInterval){
        return otherInterval && 
            otherInterval instanceof bestGlobals.TimeInterval && 
            this.timeInterval.ms == otherInterval.timeInterval.ms;
    }
}

bestGlobals.TimeInterval.prototype.toString = function toString(){
    return this.toHms(false,true,false);
}

bestGlobals.TimeInterval.prototype.toPostgres = function toPostgres(){
    return this.timeInterval.ms+'ms';
}

bestGlobals.timeInterval = function timeInterval(timePack) {
    return new bestGlobals.TimeInterval(timePack);
};

bestGlobals.functionName = function functionName(fun) {
    if(typeof fun !== "function"){
        throw new Error("non function in functionName");
    }
    return fun.name||fun.toString().replace(/^\s*function\s*([^(]*)\((.|\s)*$/i,'$1')||'anonymous';
};

bestGlobals.constructorName = function constructorName(obj) {
    if(obj){
        return bestGlobals.functionName(obj.constructor);
    }else{
        console.log('deprecate use of constructorName with non-object for',obj);
        console.log('it will throw Error in future releases');
    }
};

bestGlobals.escapeRegExp = function escapeRegExp(text){
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_special_characters
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

var letterTranslator = {
    'à':'a', 'á':'a', 'â':'a', 'ã':'a', 'ä':'a', 'å':'a', 'À':'a', 'Á':'a', 'Â':'a', 'Ã':'a', 'Ä':'a', 'Å':'a',
    'è':'e', 'é':'e', 'ê':'e', 'ë':'e', 'È':'e', 'É':'e', 'Ê':'e', 'Ë':'e',
    'ì':'i', 'í':'i', 'î':'i', 'ï':'i', 'Ì':'i', 'Í':'i', 'Î':'i', 'Ï':'i',
    'ò':'o', 'ó':'o', 'ô':'o', 'õ':'o', 'ö':'o', 'Ò':'o', 'Ó':'o', 'Ô':'o', 'Õ':'o', 'Ö':'o',
    'ù':'u', 'ú':'u', 'û':'u', 'ü':'u', 'Ù':'u', 'Ú':'u', 'Û':'u', 'Ü':'u',
    'ñ':'nzzzzzzzzzz', 'Ñ':'nzzzzzzzzzz'
};

var letterTranslatorRegexp = new RegExp(
    '['+
    bestGlobals.escapeRegExp(Object.keys(letterTranslator).join(''))+
    ']','g'
);

bestGlobals.auxComplementInteger = function auxComplementInteger(integerText){
    return integerText.split('').map(function(digitText){ return digitText==='.'?'.':''+(9-digitText); }).join('');
}

bestGlobals.forOrder = function forOrder(text){
    if(text==null){
        return 'zzz(null)';
    }
    if(text instanceof Date){
        return text.toISOString();
    }
    var coalesce = bestGlobals.coalesce;
    var main=[];
    var signs=[];
    var canBeNegative=true;
    var normal=text.toString()
    .replace(letterTranslatorRegexp, function(letter){ return letterTranslator[letter]; })
    .replace(
        /([a-z]+)|((-?)0*(0|[1-9][0-9]*)(\.[0-9]+)?)|([^a-z0-9])/ig, 
        function(t, letters, nums, sign, integer, decimals, others){
            if(letters){
                main.push(' '+letters.toLowerCase());
            }
            if(nums){
                var negative;
                if(sign && canBeNegative){
                    integer = bestGlobals.auxComplementInteger(integer);
                    decimals = bestGlobals.auxComplementInteger(decimals||'');
                    negative = true;
                }else{
                    negative = false;
                }
                main.push(' '+(negative?'A':'')+String.fromCharCode(65+coalesce(integer,'').length)+coalesce(integer,'')+coalesce(decimals,''));
            }
            canBeNegative=false;
            if(others){
                canBeNegative=true;
                signs.push(' , '+others);
            }
        }
    );
    return main.join('')+signs.join('')+'   '+text;
};

bestGlobals.forOrder.Native = function forOrderNative(a){
    return a;
};

bestGlobals.nullsOrder = 1; // 1=last -1=first;

bestGlobals.compareForOrder = function compareForOrder(sortColumns){
    var thisModule = this;
    return function forOrderComparator(row1,row2){
        var column;
        var i=0;
        do{
            var order = bestGlobals.coalesce(sortColumns[i].order, 1);
            column=sortColumns[i].column;
            if(row1[column]==null){
                if(row2[column]!=null){
                    return thisModule.nullsOrder;
                }
            }else if(row2[column]==null){
                return -thisModule.nullsOrder;
            }else{
                var a=(sortColumns[i].func||thisModule.forOrder)(row1[column]);
                var b=(sortColumns[i].func||thisModule.forOrder)(row2[column]);
                if(a>b){
                    return 1*order;
                }else if(a<b){
                    return -1*order;
                }
            }
            i++;
        }while(i<sortColumns.length);
        return 0;
    };
};

bestGlobals.sleep = function sleep(milliseconds){
    var pseudoFunction = function sleepAndPass(value){
        return new Promise(function(resolve){
            setTimeout(function(){ resolve(value); },milliseconds);
        });
    };
    pseudoFunction.then = function then(f){
        return pseudoFunction().then(f);
    };
    return pseudoFunction;
};

/* istanbul ignore next */
bestGlobals.registerJson4All = function registerJson4All(JSON4all){
    JSON4all.addType(Date, {
        specialTag: function specialTag(value){
            if(value.isRealDate){
                return 'date';
            }else{
                return 'Date';
            }
        },
        construct:function construct(value){
            return new Date(value);
        },
        deconstruct:function deconstruct(date){
            if(date.isRealDate){
                return date.toYmd();
            }else{
                return date.getTime();
            }
        }
    });
    JSON4all.addType('date', {
        construct: function construct(value){
            return bestGlobals.date.iso(value);
        },
    });
    JSON4all.addType(bestGlobals.Datetime, {
        construct: function construct(value){
            return bestGlobals.datetime.iso(value);
        },
        deconstruct: function construct(datetime){
            return datetime.toPlainString();
        },
    });
};

/* istanbul ignore next */
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
// 2017-03-26
// https://tc39.github.io/ecma262/#sec-array.prototype.find
// adapted by Emilio Platzer
function arrayFind(predicate){
 // 1. Let O be ? ToObject(this value).
  if (this == null) {
    throw new TypeError('"this" is null or not defined');
  }

  var o = Object(this);

  // 2. Let len be ? ToLength(? Get(O, "length")).
  var len = o.length >>> 0;

  // 3. If IsCallable(predicate) is false, throw a TypeError exception.
  if (typeof predicate !== 'function') {
    throw new TypeError('predicate must be a function');
  }

  // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
  var thisArg = arguments[1];

  // 5. Let k be 0.
  var k = 0;

  // 6. Repeat, while k < len
  while (k < len) {
    // a. Let Pk be ! ToString(k).
    // b. Let kValue be ? Get(O, Pk).
    // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
    // d. If testResult is true, return kValue.
    var kValue = o[k];
    if (predicate.call(thisArg, kValue, k, o)) {
      return kValue;
    }
    // e. Increase k by 1.
    k++;
  }

  // 7. Return undefined.
  return undefined;
}

/* istanbul ignore next */
if(!Array.prototype.find){
  Object.defineProperty(Array.prototype, 'find', {
    value: arrayFind
  });
}

bestGlobals.arrayFind = arrayFind;

bestGlobals.serie = function serie(NorFirst, NifNoFirst){
    var n     = NifNoFirst==null ? NorFirst : NifNoFirst;
    var first = NifNoFirst==null ? 0        : NorFirst  ;
    return Array.apply(null, Array(n)).map(function (_, i) {return i+first;});
};

var MAX_SAFE_INTEGER = bestGlobals.MAX_SAFE_INTEGER = 9007199254740991;

bestGlobals.sameValue = function sameValue(a,b){
    return a==b ||
      a instanceof Date && b instanceof Date && a.getTime() == b.getTime() ||
      typeof a === 'number' && (a>MAX_SAFE_INTEGER || a< -MAX_SAFE_INTEGER) && Math.abs(a/b)<1.00000000000001 && Math.abs(a/b)>0.99999999999999 ||
      a && !!a.sameValue && a.sameValue(b);
}

return bestGlobals;

});
