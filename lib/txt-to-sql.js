"use strict";

var txtToSql = {};

var changing = require('best-globals').changing;    
var iconv = require('iconv-lite');

var margin = ' ';
var separators=';,\t|';

/* istanbul ignore if  */
if (typeof Object.assign != 'function') {
  (function () {
    Object.assign = function (target) {
      //'use strict';
      // We must check against these specific cases.
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}


function adaptPlain(x){
    if(x===''){ return 'null'; }
    return x; 
}

function adaptText(x){
    if(x===''){ return 'null'; }
    return "'"+x.replace(/'/g,"''").replace(/\r/g,"' || LQ(10) || '").replace(/\n/g,"' || LQ(13) || '")+"'"; 
}

function filling(columnLength, val) { return val.length>=columnLength?'':new Array(columnLength - val.length + 1).join(' '); }
function padLeft(columnLength, val) { return val+filling(columnLength, val); }
function padRight(columnLength, val) { return filling(columnLength,val)+val; }

var types = [
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]{1,5}$/},                                      // integer
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+$/},                                          // bigint
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+\.?[0-9]*$/,                 useLength:true}, // numeric
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+\.?[0-9]*([eE]-?[0-9]+)?$/},                  // double precision
    {adapt:adaptText , pad:padLeft , dataPattern:/.?/,                                  useLength:true}  // character varying
];

function mapTypes(typeNames) {
    return typeNames.map(function(type, index) { return Object.assign({typeName:type}, types[index]); });
}

var quoteBackTick = { LQ:'`', RQ:'`', fun:function(objectName) { return '`'+objectName.replace(/`/g,'``')+'`'; } };
// Solo hay que escapar ']' de acuerdo con: https://technet.microsoft.com/en-us/library/ms176027(v=sql.105).aspx
var quoteBracket = { LQ:'[', RQ:']', fun:function(objectName) { return '['+objectName.replace(/]/g,']]')+']'; } };
var quoteDouble = { LQ:'"', RQ:'"', fun:function(objectName) { return '"'+objectName.replace(/"/g,'""')+'"'; } };

function dropTableIfExists(tableName) { return "drop table if exists "+tableName; }
function dropTable(tableName) { return "drop table "+tableName; }

var engines = {
    'postgresql': {
        types:mapTypes(['integer','bigint','numeric','double precision','character varying']),
        quote:quoteDouble,
        dropTable:dropTableIfExists
    },
    'mssql': {
        types:mapTypes(['integer','bigint','numeric','real','varchar']),
        quote:quoteBracket,
        noCompactInsert:true,
        dropTable:dropTable
    },
    'mysql': {
        types:mapTypes(['integer','bigint','numeric','double precision','varchar']),
        quote:quoteBackTick,
        dropTable:dropTableIfExists
    },
    'oracle': {
        types:mapTypes(['integer','long','number','number','varchar2']),
        quote:quoteDouble,
        noCompactInsert:true,
        dropTable:dropTable
    },
    'sqlite': {
        types:mapTypes(['integer','integer','numeric','real','text']),
        quote:quoteDouble,
        dropTable:dropTableIfExists
    }
};

function throwIfErrors(errors) {
    if(errors.length) {
        var e = new Error();
        e.errors = errors;
        throw e;
    }
}

function getEncodingSinc(buf) {
    // si es un continuador
    function cont(code) { return code>=128 && code<192; }
    function case1(code) { return code>=192 && code<224; }
    function case2(code) { return code>=224 && code<240; }
    function case3(code) { return code>=240 && code<248; }
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
}

function getEncoding(buf) {
    return Promise.resolve(buf).then(function(buf) {
        return getEncodingSinc(buf);
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
    outputEncoding: false,
    addDropTable: false
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
    if(! info.rawTable) { errors.push('no rawTable in input'); } else if(!(info.rawTable instanceof Buffer)){ errors.push('info.rawTable must be an Buffer');}
    if(! (info.opts.columnNamesFormat in formatFunctions)) {
        errors.push("inexistent column names format '"+info.opts.columnNamesFormat+"'");
    }
    if(! (info.opts.outputEngine in engines)) {
        errors.push("unsupported output engine '"+info.opts.outputEngine+"'");
    }
    checkEncodingParam(info.opts.inputEncoding, 'input', errors);
    checkEncodingParam(info.opts.outputEncoding, 'output', errors);
    throwIfErrors(errors);
    info.outputEngine=engines[info.opts.outputEngine];
    info.quote = function(objectName) { return info.outputEngine.quote.fun(objectName); };
    info.transform = function(objectName) { return formatFunctions[info.opts.columnNamesFormat](objectName); };
    info.nameColumn = function(columnInfo) {
        var name = columnInfo.name+" "+columnInfo.typeInfo.typeName;
        if(! columnInfo.typeInfo.useLength) { return name; }
        var scale = parseInt(columnInfo.maxScale!==null?columnInfo.maxScale:0);
        var precision = parseInt(columnInfo.maxLength)+scale+(scale>0?1:0);
        return name + (columnInfo.maxLength<1 ?'':('('+precision+(scale>0 ? ','+scale:'')+')'));
    };
    
    return info;
}

function compareBuffers(one, two) {
    var max = Math.max(one.length, two.length);
    for(var i=0; i<max; i++){ if(one[i]!==two[i]) { return i; } }
    return -1;
}

function processEncodingOptions(info) {
    return getEncoding(info.rawTable).then(function(encoding) {
        info.inputEncodingDetected = encoding;
        if(! info.opts.inputEncoding) { info.opts.inputEncoding = info.inputEncodingDetected; }
        if(! info.opts.outputEncoding) { info.opts.outputEncoding = info.inputEncodingDetected; }
        var inFromToString = info.rawTable.toString("utf8");
        if(info.opts.inputEncoding==='ANSI') {
            if(inFromToString.substr(1).indexOf('\uFFFD')<0) {
                throw new Error('ansi -> utf8: replacement character not found');
            }
            info.decodedBuffer = iconv.decode(info.rawTable, "win1252");
            if(compareBuffers(info.decodedBuffer, info.rawTable) === -1) {
                throw new Error('ansi -> utf8: no conversion performed');
            }
        } else if(info.opts.inputEncoding==='UTF8') {
            info.decodedBuffer = inFromToString;
            var result = compareBuffers(info.rawTable, new Buffer(info.decodedBuffer, 'utf8'));
            if(result !== -1) {
                throw new Error('utf8 check failed in position: '+result);
            }
        } else {
            info.decodedBuffer = inFromToString;
        }
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
    if(info.opts.columns && 'name' in info.opts.columns[0]) {
        if(info.opts.columns.length !== info.columnsInfo.length) {
            throw new Error('wrong number of column names: expected '+
                            info.columnsInfo.length+
                            ', obtained '+info.opts.columns.length);
        }
        info.columnsInfo.forEach(function(column, index) {
            column.name = info.opts.columns[index].name;
        });
    }
    info.rows = info.lines.filter(function(line){ return line.trim()!==""; })
                          .map(function(line){ return line.split(info.opts.separator);});
    return info;
}

function verifyColumnCount(info) {
    var errors=[];
    info.rows.forEach(function(row, index) {
        if(row.length !== info.columnsInfo.length) {
            // index 0 son los nombres de campo
            errors.push("row #"+(index+1)+" has "+row.length+" fields, should have "+info.columnsInfo.length);
        } 
    });
    throwIfErrors(errors);
    return info;
}

function transformNames(info) {
    info.formatedTableName = info.transform(info.tableName);
    info.columnsInfo.forEach(function(column){ column.name=info.transform(column.name); });
    return info;
}

function verifyColumnNames(info) {
    var errors=[];
    var namesHash = {};
    var empty = "";
    info.columnsInfo.forEach(function(columnInfo, columnIndex){
        if(columnInfo.name===empty) {
            errors.push("missing name for column #"+(columnIndex+1));
        } else {
            if(columnInfo.name in namesHash) {
                errors.push("duplicated column name '"+info.quote(columnInfo.name)+"'");
            } else {
                namesHash[columnInfo.name] = true;
            }
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
                while(!row[columnIndex].match(info.outputEngine.types[typeIndex].dataPattern)) { typeIndex++; }
                if(typeIndex>maxTypeIndex){
                    maxTypeIndex=typeIndex;
                }
            }
        });
        columnInfo.typeInfo = info.outputEngine.types[maxTypeIndex];
    });
    return info;
}


function isTextType(typeName) { return typeName.match(/(text|char)/); }
function hasCientificNotation(typeName) { return typeName==='double precision'?false:null; }

function getLengthInfo(val, typeName) {
    if(isTextType(typeName)) { return {length:val.length || 0, scale:0}; }
    if(! val) { return {length:0, scale:0}; }
    var num = val.split('.');
    return {length:num[0].length, scale:num.length===2?num[1].length:0};
}

function haveColumnInfo(info, prop, index) {
    return (info.opts.columns && info.opts.columns.length && info.opts.columns[index].hasOwnProperty(prop) ? true : false);
}
function setCol(info, prop, index, defVal, stateArray) {
    if(haveColumnInfo(info, prop, index)) {
        stateArray[prop] = true;
        return info.opts.columns[index][prop];
    }
    stateArray[prop] = false;
    return defVal;
}

function determineColumnValuesInfo(info) {
    var defaults = new Array(info.columnsInfo.length);
    info.columnsInfo.forEach(function(colInfo, colIndex) {
        colInfo.maxLength            = setCol(info, 'maxLength', colIndex, 0, defaults);
        colInfo.maxScale             = setCol(info, 'maxScale', colIndex, isTextType(colInfo.typeInfo.typeName)?null:0, defaults); // maxima cantidad de decimales
        colInfo.hasNullValues        = setCol(info, 'hasNullValues', colIndex, false, defaults);
        colInfo.hasCientificNotation = setCol(info, 'hasCientificNotation', colIndex, hasCientificNotation(colInfo.typeInfo.typeName), defaults);
    });
    info.rows.forEach(function(row) {
        info.columnsInfo.forEach(function(column, columnIndex) {
            var val=row[columnIndex];
            var lenInfo = getLengthInfo(val, column.typeInfo.typeName);
            if(! defaults.maxLength && column.maxLength<lenInfo.length) { column.maxLength=lenInfo.length; }
            if(! defaults.maxScale && column.maxScale!==null && column.maxScale<lenInfo.scale) { column.maxScale=lenInfo.scale; }
            if(! defaults.hasNullValues && ! column.hasNullValues && ! val) { column.hasNullValues=true; }
            if(! defaults.hasCientificNotation && column.hasCientificNotation===false && val.match(/[eE]/)) { column.hasCientificNotation=true; }
        });
    });
    return  info;
}

function determinePrimaryKey(info) {
    if(info.opts.includePrimaryKey) {
        var columnsInKey = [];
        var haveCustomKeys = info.columnsInfo.filter(function(col,colIndex) {
            if(haveColumnInfo(info, 'inPrimaryKey', colIndex)) {
                if(info.opts.columns[colIndex].inPrimaryKey===true) {
                    columnsInKey.push(colIndex);
                }
                return true;
            }
            columnsInKey.push(colIndex);
            return false;
        });
        if(haveCustomKeys.length && columnsInKey.length===0) {
            throw new Error("includePrimaryKey is on but no columns were selected");
        }
        try{
            //console.log("columnsInKey", columnsInKey); console.log("LEN", info.rows.length)
            var numRows = info.rows.length;
            var combinedKeys=new Array(info.rows.length);
            combinedKeys.fill('')
            // console.log("combinedKeys.length", combinedKeys.length); console.log("combinedKeys", combinedKeys)
            columnsInKey.some(function(column, columnIndex) {
                var combinedKeysHash = {};
                if(!info.rows.every(function(row, rowIndex) {
                    //var val = row[columnIndex];
                    var val = row[column];
                    //console.log("Testing ["+val+"]", columnIndex, rowIndex)
                    if(val==='') {
                        //console.log("  HNC")
                        throw new Error("haveNullColumns");
                    }
                    var prevRI = combinedKeys[rowIndex];
                    combinedKeys[rowIndex] = combinedKeys[rowIndex]+JSON.stringify(val);
                    if(combinedKeysHash[combinedKeys[rowIndex]]){
                        //console.log("HASH", combinedKeysHash);
                        //console.log("prevRI", prevRI);
                        //console.log("   IN HASH ["+combinedKeys[rowIndex]+"] is in ", combinedKeysHash)
                        return false;
                    }
                    //console.log("   PREV HASH", combinedKeysHash)
                    combinedKeysHash[combinedKeys[rowIndex]]=true;
                    //console.log("   HASH", combinedKeys[rowIndex], " -> ", combinedKeysHash);
                    //console.log("KEYS", combinedKeys[rowIndex]);
                    //console.log("HASH", combinedKeysHash);
                    return true;
                })){
                    return false;
                }else{
                    //info.primaryKey = info.columnsInfo.slice(columnsInKey[0],columnIndex+1).map(function(col) { return col.name; });
                    //info.primaryKey = info.columnsInfo.slice(columnsInKey[0],columnsInKey[columnIndex]+1).map(function(col) { return col.name; });
                    info.primaryKey = info.columnsInfo.slice(columnsInKey[0],columnsInKey[columnIndex]+1).map(function(col) { return info.quote(col.name); });
                    return true; 
                }
            });
        }catch(err){
            if(err.message!=="haveNullColumns") { throw err; }
        }
        if(haveCustomKeys.length && (! info.primaryKey || ! info.primaryKey.length)) {
            var failingColumns = columnsInKey.map(function(col) {
                return info.columnsInfo[col].name;
            }).join(',');
            throw new Error('requested columns ('+failingColumns+') failed to be a PrimaryKey');
        }
    }
    var primaryKey = info.primaryKey || [];
    info.columnsInfo.forEach(function(columnInfo) {
        columnInfo.inPrimaryKey = primaryKey.indexOf(info.quote(columnInfo.name)) !== -1;
    });
    return info;
}

function quoteNames(info) {
    info.formatedTableName = info.quote(info.formatedTableName);
    info.columnsInfo.forEach(function(column){ column.name=info.quote(column.name); });
    return info;
}

function generateDropTable(info) {
    info.scripts=[];
    if(info.opts.addDropTable) {
        info.scripts.push({type:'drop table', sql: info.outputEngine.dropTable(info.formatedTableName)+';\n'});
    }
    return info;
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
    info.scripts.push({type:'create table', sql: scriptLines.join('\n')});
    return info;
}

function createInsertValues(rows, columnsInfo) {
    return rows.map(function(row){
        var owedLength = 0;
        return margin+"("+row.map(function(adaptedValue,columnIndex){
            var column = columnsInfo[columnIndex];
            var recoveredLength = 0;
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
        }).join(', ')+')';
    });
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
    var insertInto = "insert into "+info.formatedTableName+" ("+info.columnsInfo.map(function(columnInfo){
            return columnInfo.name;
        }).join(', ')+") values";
    var insertValues = createInsertValues(adaptedRows, info.columnsInfo);
    info.scripts.push({
        type:'insert',
        sql:info.outputEngine.noCompactInsert ?
            insertValues.map(function(c) { return insertInto + c + ";"; }).join('\n') :
            insertInto + '\n' +insertValues.join(',\n')+';'
    });
    return info;
}

function processOutputBuffer(info) {
    var sqls=info.scripts.map(function(script) { return script.sql; }).join('\n');
    info.rawSql = info.opts.outputEncoding === 'UTF8'? new Buffer(sqls) : iconv.encode(sqls, "win1252");
    return info;
}


function setup(info) {
    return Promise.resolve(info)
        .then(verifyInputParams)
        .then(processEncodingOptions)
        .then(separateLines)
        .then(determineSeparator)
        .then(separateColumns)
        .then(verifyColumnCount)
        .then(transformNames)
        .then(verifyColumnNames)
        .then(determineColumnTypes)
        .then(determineColumnValuesInfo)
        .then(determinePrimaryKey)
        .then(quoteNames);
}

function catchErrors(info, err) {
    //console.log("err", err); console.log("err.stack", err.stack); console.log("opts", info.opts)
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
    .then(generateDropTable)
    .then(generateCreateScript)
    .then(generateInsertScript)
    .then(processOutputBuffer)
    .catch(catchErrors.bind(null, info));
}

txtToSql.isTextType = isTextType;
txtToSql.getLengthInfo = getLengthInfo;
txtToSql.prepare = prepare;
txtToSql.generateScripts = generateScripts;
txtToSql.engines = engines;
txtToSql.getEncodingSinc = getEncodingSinc;
txtToSql.getEncoding = getEncoding;
txtToSql.compareBuffers = compareBuffers;

module.exports = txtToSql;