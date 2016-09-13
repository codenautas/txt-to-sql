"use strict";

var txtToSql = {};

var changing = require('best-globals').changing;    
var iconv = require('iconv-lite');

var margin = ' ';
var separators=';,\t|';

function adaptPlain(x){
    if(x===''){ return 'null'; }
    return x; 
}

function adaptText(x){
    if(x===''){ return 'null'; }
    return "'"+x.replace(/'/g,"''").replace(/\r/g,"' || chr(10) || '").replace(/\n/g,"' || chr(13) || '")+"'"; 
}

function filling(columnLength, val) { return val.length>=columnLength?'':new Array(columnLength - val.length + 1).join(' '); }
function padLeft(columnLength, val) { return val+filling(columnLength, val); }
function padRight(columnLength, val) { return filling(columnLength,val)+val; }

var types = [
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]{1,5}$/},                     // integer
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+$/},                         // bigint
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+\.?[0-9]*$/},                // numeric
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+\.?[0-9]*([eE]-?[0-9]+)?$/}, // double precision
    {adapt:adaptText , pad:padLeft , dataPattern:/.?/}                                  // character varying
];

function mapTypes(typeNames) {
    return typeNames.map(function(type, index) { return Object.assign({typeName:type}, types[index]); });
}

var quoteBackTick = { chr:'`', fun:function(objectName) { return '`'+objectName.replace(/`/g,'``')+'`'; } };
// Solo hay que escapar ']' de acuerdo con: https://technet.microsoft.com/en-us/library/ms176027(v=sql.105).aspx
var quoteBracket = { chr:']', fun:function(objectName) { return '['+objectName.replace(/]/g,']]')+']'; } };
var quoteDouble = { chr:'"', fun:function(objectName) { return '"'+objectName.replace(/"/g,'""')+'"'; } };

var engines = {
    'postgresql': {
        types:mapTypes(['integer','bigint','numeric','double precision','character varying']),
        quote:quoteDouble
    },
    'mssql': {
        types:mapTypes(['integer','bigint','numeric','real','varchar']),
        quote:quoteBracket
    },
    'mysql': {
        types:mapTypes(['integer','bigint','numeric','double precision','varchar']),
        quote:quoteBackTick
    },
    'oracle': {
        types:mapTypes(['integer','longinteger','number','number','varchar2']),
        quote:quoteDouble
    },
    'sqlite': {
        types:mapTypes(['integer','integer','numeric','real','text']),
        quote:quoteDouble
    }
};

function throwIfErrors(errors) {
    if(errors.length) {
        var e = new Error();
        e.errors = errors;
        throw e;
    }
}

// devuelve 'ASCII7', 'UTF8' o 'ANSI'
function getEncoding(buf) {
    // si es un continuador
    function cont(code) { return code>=128 && code<192; }
    function case1(code) { return code>=192 && code<224; }
    function case2(code) { return code>=224 && code<240; }
    function case3(code) { return code>=240 && code<248; }
    
    return Promise.resolve(buf).then(function(buf) {
        var type = 'ASCII7';
        var i=0;
        var code;
        while(i<buf.length) {
            if(buf[i]>127) {
                type = 'UTF8';
                if(case1(buf[i]) && cont(buf[i+1])) { i+=2; continue; }
                if(case2(buf[i]) && cont(buf[i+1]) && cont(buf[i+2])) { i+=3; continue; }
                if(case3(buf[i]) && cont(buf[i+1]) && cont(buf[i+2]) && cont(buf[i+3])) { i+=4; continue; }
                type = 'ANSI';
                break;
            } else {
                i+=1;
            }
        }
        return type;
    });
}

txtToSql.defaultOpts = {
    columnNamesFormat: 'lowercased_names',
    separator: false,
    includePrimaryKey: true,
    columnAlignedCommas: false,
    columnAlignedMaxWidth: 100,
    outputEngine: 'postgresql',
    verboseErrors: false,
    inputEncoding: false,
    outputEncoding: false
};

var letterTranslator = {
    'à':'a', 'á':'a', 'â':'a', 'ã':'a', 'ä':'a', 'å':'a', 'À':'a', 'Á':'a', 'Â':'a', 'Ã':'a', 'Ä':'a', 'Å':'a',
    'è':'e', 'é':'e', 'ê':'e', 'ë':'e', 'È':'e', 'É':'e', 'Ê':'e', 'Ë':'e',
    'ì':'i', 'í':'i', 'î':'i', 'ï':'i', 'Ì':'i', 'Í':'i', 'Î':'i', 'Ï':'i',
    'ò':'o', 'ó':'o', 'ô':'o', 'õ':'o', 'ö':'o', 'Ò':'o', 'Ó':'o', 'Ô':'o', 'Õ':'o', 'Ö':'o',
    'ù':'u', 'ú':'u', 'û':'u', 'ü':'u', 'Ù':'u', 'Ú':'u', 'Û':'u', 'Ü':'u',
    'ñ':'n', 'Ñ':'n'
};

var formatFunctions = {
    'unmodified' : function(objectName) { return objectName; },
    'lowercased_names' : function(objectName) { return objectName.toLowerCase(); },
    'lowercased_alpha' : function(objectName) {
        objectName = objectName.split('')
                               .map(function(letter) { return letterTranslator[letter] || letter; })
                               .join('');
        objectName = objectName.replace(/[^a-zA-Z0-9]/g, '_');
        if(objectName.charAt(0).match(/[0-9]/)) { objectName = '_'+objectName; }
        return objectName.toLowerCase();
    },
};

function checkEncodingParam(encoding, inOrOut, errors) {
    if(encoding && ! encoding.match(/^(ASCII7|UTF8|ANSI)$/)) {
        errors.push("unsupported "+inOrOut+" encoding '"+encoding+"'");
    }
}

function verifyInputParams(info){
    info.opts = changing(txtToSql.defaultOpts, info.opts || {});
    var errors=[];
    if(! info.tableName) { errors.push('undefined table name'); }
    if(! info.txt) { errors.push('no txt in input'); }
    if(! (info.opts.columnNamesFormat in formatFunctions)) {
        errors.push("inexistent column names format '"+info.opts.columnNamesFormat+"'");
    }
    if(! (info.opts.outputEngine in engines)) {
        errors.push("unsupported output engine '"+info.opts.outputEngine+"'");
    }
    checkEncodingParam(info.opts.inputEncoding, 'input', errors);
    checkEncodingParam(info.opts.outputEncoding, 'output', errors);
    throwIfErrors(errors);
    var outputEngine=engines[info.opts.outputEngine];
    info.typePatterns = outputEngine.types;
    info.transform = function(objectName) { return outputEngine.quote.fun(formatFunctions[info.opts.columnNamesFormat](objectName)); };
    info.nameColumn = function(columnInfo) {
        var scale = columnInfo.maxScale!==null?columnInfo.maxScale:0;
        var precision = columnInfo.maxLength+scale+(scale>0?1:0);
        return columnInfo.name+" "+
               columnInfo.typeInfo.typeName+
               (columnInfo.maxLength<1 ?'':('('+precision+(scale>0 ? ','+scale:'')+')'));
    };
    return info;
}

function processEncodingOptions(info) {
    return getEncoding(info.txt).then(function(encoding) {
        info.inputEncodingDetected = encoding;
        if(! info.opts.inputEncoding) { info.opts.inputEncoding = info.inputEncodingDetected; }
        if(! info.opts.outputEncoding) { info.opts.outputEncoding = info.inputEncodingDetected; }
        //console.log("DETECTED", info.inputEncodingDetected, "INPUT", info.opts.inputEncoding)
        info.decodedBuffer = info.opts.inputEncoding==='ANSI' ? iconv.decode(info.txt, "utf8") : info.txt.toString('utf8');
        return info;
    });
}

function separateLines(info){
    info.lines = info.decodedBuffer.split(/\r?\n/);
    info.headers = info.lines.shift();
    return info;
}

function determineSeparator(info){
    if(! info.opts.separator) {
        var separatorCandidates = separators.split('');
        separatorCandidates.push(/\s+/);
        separatorCandidates = separatorCandidates.filter(function(separator){
            return info.headers.split(separator).length>1;
        });
        if(separatorCandidates.length<=0){
            throw new Error('no separator detected');
        }
        info.opts.separator=separatorCandidates[0];
    }
    return info;
}

function separateColumns(info){
    info.columnsInfo = info.headers.split(info.opts.separator).map(function(name){ return {
        name:name,
        columnLength:0,
    };});
    if(info.opts.columnNames) {
        if(info.opts.columnNames.length !== info.columnsInfo.length) {
            throw new Error('wrong number of column names: expected '+
                            info.columnsInfo.length+
                            ', obtained '+info.opts.columnNames.length);
        }
        info.columnsInfo.forEach(function(column, index) {
            column.name = info.opts.columnNames[index];
        });
    }
    info.rows = info.lines.filter(function(line){ return line.trim()!==""; })
                          .map(function(line){ return line.split(info.opts.separator);});
    return info;
}

function transformNames(info) {
    info.formatedTableName = info.transform(info.tableName);
    info.columnsInfo.forEach(function(column){ column.name=info.transform(column.name); });
    return info;
}

function verifyColumnNameDuplication(info) {
    var errors=[];
    var namesHash = {};
    info.columnsInfo.forEach(function(columnInfo, columnIndex){
        if(columnInfo.name in namesHash) {
            errors.push("duplicated column name '"+columnInfo.name+"'");
        } else {
            namesHash[columnInfo.name] = true;
        }
    });
    throwIfErrors(errors);
    return info;
}

function determineColumnTypes(info){
    info.columnsInfo.forEach(function(columnInfo, columnIndex){
        var maxTypeIndex=0;
        info.rows.forEach(function(row){
            var typeIndex=0;
            if(row[columnIndex]){
                while(!row[columnIndex].match(info.typePatterns[typeIndex].dataPattern)) { typeIndex++; }
                if(typeIndex>maxTypeIndex){
                    maxTypeIndex=typeIndex;
                }
            }
        });
        columnInfo.typeInfo = info.typePatterns[maxTypeIndex];
    });
    return info;
}

function determinePrimaryKey(info) {
    if(info.opts.includePrimaryKey) {
        try{
            var combinedKeys=new Array(info.rows.length);
            info.columnsInfo.some(function(column, columnIndex) {
                var combinedKeysHash = {};
                if(!info.rows.every(function(row, rowIndex) {
                    var val = row[columnIndex];
                    if(val==='') {
                        throw new Error("haveNullColumns");
                    }
                    combinedKeys[rowIndex] = combinedKeys[rowIndex]+JSON.stringify(val);
                    if(combinedKeysHash[combinedKeys[rowIndex]]){
                        return false;
                    }
                    combinedKeysHash[combinedKeys[rowIndex]]=true;
                    return true;
                })){
                    return false;
                }else{
                    info.primaryKey = info.columnsInfo.slice(0,columnIndex+1).map(function(col) { return col.name; });
                    return true; 
                }
            });
        }catch(err){
            if(err.message!=="haveNullColumns") { throw err; }
        }
    }
    return info;
}

function isTextType(typeName) { return typeName.match(/(text|char)/); }

function getLengthInfo(val, typeName) {
    if(isTextType(typeName)) { return {length:val.length || 0, scale:0}; }
    if(! val) { return {length:0, scale:0}; }
    var num = val.split('.');
    return {length:num[0].length, scale:num.length===2?num[1].length:0};
}

function determineColumnValuesInfo(info) {
    var primaryKey = info.primaryKey || [];
    info.columnsInfo.forEach(function(columnInfo) {
        columnInfo.inPrimaryKey         = primaryKey.indexOf(columnInfo.name) !== -1;
        columnInfo.maxLength            = 0;
        columnInfo.maxScale             = isTextType(columnInfo.typeInfo.typeName)?null:0; // maxima cantidad de decimales
        columnInfo.hasNullValues        = false;
        columnInfo.hasCientificNotation = columnInfo.typeInfo.typeName==='double precision'?false:null;
    });
    info.rows.forEach(function(row) {
        info.columnsInfo.forEach(function(column, columnIndex) {
            var val=row[columnIndex];
            var lenInfo = getLengthInfo(val, column.typeInfo.typeName);
            if(column.maxLength<lenInfo.length) { column.maxLength=lenInfo.length; }
            if(column.maxScale!==null && column.maxScale<lenInfo.scale) { column.maxScale=lenInfo.scale; }
            if(! column.hasNullValues && ! val) { column.hasNullValues=true; }
            if(column.hasCientificNotation===false && val.match(/[eE]/)) { column.hasCientificNotation=true; }
        });
    });
    return  info;
}

function generateCreateScript(info){
    var scriptLines = [];
    scriptLines.push("create table "+info.formatedTableName+" (");
    var scriptLinesForTableColumns = [];
    info.columnsInfo.forEach(function(columnInfo){
        scriptLinesForTableColumns.push(margin+info.nameColumn(columnInfo));
    });
    if(info.primaryKey) { scriptLinesForTableColumns.push(margin+'primary key ('+info.primaryKey.join(', ')+')'); }
    scriptLines.push(scriptLinesForTableColumns.join(",\n"));
    scriptLines.push(');\n');
    info.scripts=[];
    info.scripts.push({type:'create table', sql: scriptLines.join('\n')});
    return info;
}

function generateInsertScript(info){
    var adaptedRows = info.rows.map(function(row, rowIndex) {
        return info.columnsInfo.map(function(column, columnIndex) {
            var adaptedValue = column.typeInfo.adapt(row[columnIndex]);
            if(info.opts.columnAlignedCommas) {
                if(adaptedValue.length>column.columnLength) { 
                    column.columnLength = adaptedValue.length; 
                }
            }
            return adaptedValue;
        });
    });
    info.columnsInfo.forEach(function(column){
        column.columnLength = info.opts.columnAlignedCommas?
            Math.min(column.columnLength, info.opts.columnAlignedMaxWidth):0;
    });
    info.scripts.push({type:'insert', sql:
        "insert into "+info.formatedTableName+" ("+info.columnsInfo.map(function(columnInfo){
            return columnInfo.name;
        }).join(', ')+") values\n"+
        adaptedRows.map(function(row){
            var owedLength = 0;
            return margin+"("+row.map(function(adaptedValue,columnIndex){
                var column = info.columnsInfo[columnIndex];
                var recoveredLength = 0;
                var debug=false;
                if(adaptedValue.length>column.columnLength-owedLength){
                    owedLength=adaptedValue.length-(column.columnLength-owedLength);
                    recoveredLength = column.columnLength-adaptedValue.length;
                }else{
                    recoveredLength = owedLength;
                    owedLength = 0;
                    if(adaptedValue.length>column.columnLength-recoveredLength){
                        owedLength=adaptedValue.length-(column.columnLength-recoveredLength);
                        recoveredLength=recoveredLength-owedLength;
                    }
                }
                return column.typeInfo.pad(column.columnLength-recoveredLength, adaptedValue);
            }).join(', ')+")";
        }).join(",\n")+";"
    });
    return info;
}

function setup(info) {
    return Promise.resolve(info)
        .then(verifyInputParams)
        .then(processEncodingOptions)
        .then(separateLines)
        .then(determineSeparator)
        .then(separateColumns)
        .then(transformNames)
        .then(verifyColumnNameDuplication)
        .then(determineColumnTypes)
        .then(determinePrimaryKey)
        .then(determineColumnValuesInfo);
}

function catchErrors(info, err) {
    //console.log("err", err); console.log("err.stack", err.stack)
    var errors = (err.errors || [err.message]);
    if(info.opts.verboseErrors) { errors.push(err.stack); }
    return { errors: errors, opts:info.opts};
}

function prepare(info) {
    return setup(info)
    .then(function(info) {
        var columns = info.columnsInfo.map(function(columnInfo) {
            var col = Object.assign({type:columnInfo.typeInfo.typeName}, columnInfo);
            delete col.typeInfo;
            delete col.columnLength;
            return col;
        });
        return {opts:info.opts, columns:columns, inputEncodingDetected:info.inputEncoding};
    }).catch(catchErrors.bind(null, info));
}

function generateScripts(info){
    return setup(info)
    .then(generateCreateScript)
    .then(generateInsertScript)
    .then(function(info){
        return {
            sqls:info.scripts.map(function(script){ return script.sql.trimRight(); })
        };
    }).catch(catchErrors.bind(null, info));
}

txtToSql.isTextType = isTextType;
txtToSql.getLengthInfo = getLengthInfo;
txtToSql.prepare = prepare;
txtToSql.generateScripts = generateScripts;
txtToSql.engines = engines;
txtToSql.getEncoding = getEncoding;

module.exports = txtToSql;