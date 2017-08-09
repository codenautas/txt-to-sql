"use strict";

var txtToSql = {};

var changing = require('best-globals').changing;    
var iconv = require('iconv-lite');

var margin = ' ';
var separators=';,\t|';
var delimiters='\'"';

function adaptPlain(x){
    if(x===''){ return 'null'; }
    return x; 
}

function adaptBoolean(x) {
    var v = adaptPlain(x);
    if(v==='null') { return v; }
    for(var re=0;re<booleanRegExps.length; ++re) {
        var rgx = booleanRegExps[re];
        if(v.match(rgx.t)) { return '1'; }
        if(v.match(rgx.f)) { return '0'; }
    }
}

function adaptText(x){
    if(x===''){ return 'null'; }
    return "'"+x.replace(/'/g,"''").replace(/\r/g,"\\r").replace(/\n/g,"\\n")+"'"; 
    //return "'"+x.replace(/'/g,"''")+"'";
}

function filling(columnLength, val) { return val.length>=columnLength?'':new Array(columnLength - val.length + 1).join(' '); }
function padLeft(columnLength, val) { return val+filling(columnLength, val); }
function padRight(columnLength, val) { return filling(columnLength,val)+val; }

var booleanRegExps = [
    {t:/^1$/,       f:/^0$/},
    {t:/^1$/,       f:/^2$/},
    {t:/^t/i,       f:/^f/i},
    {t:/^[^n]/i,    f:/^[n]/i}
];

txtToSql.detectBooleans;

function isBoolean(column, rows) {
    if(!txtToSql.detectBooleans){
        return false;
    }
    var vals=[];
    for(var row=0; row<rows.length; ++row) {
        if(rows[row][column]) {
            if(vals.indexOf(rows[row][column])===-1) {
                vals.push(rows[row][column]);
            }
            if(vals.length>2) { return false; }
        }
    }
    // console.log( column, vals)
    if(vals.length===2) {
        return booleanRegExps.some(function(rgx) {
            return (vals[0].match(rgx.t) && vals[1].match(rgx.f)) ||
                   (vals[1].match(rgx.t) && vals[0].match(rgx.f));
        });
    } else {
        return vals.some(function(val) {
            return booleanRegExps.some(function(rgx) {
                return val.match(rgx.f) || val.match(rgx.t);
            });
        });
    }
}

function evaluateColumn(column, rows, regex) {
    for(var row=0; row<rows.length; ++row) {
        if(rows[row][column] && ! rows[row][column].match(regex)) {
            return false;
        }
    }
    return true;
}
function isInteger(column, rows) {
    return evaluateColumn(column, rows, /^-?[0-9]{1,5}$/);
}
function isBigInteger(column, rows) {
    return evaluateColumn(column, rows, /^-?[0-9]+$/);
}
function isNumeric(column, rows) {
    return evaluateColumn(column, rows, /^-?[0-9]+\.?[0-9]*$/);
}
function isDouble(column, rows) {
    return evaluateColumn(column, rows, /^-?[0-9]+\.?[0-9]*([eE]-?[0-9]+)?$/);
}
var year='[1-9]?[0-9]{3}';
var mon='[01]?[0-9]';
var day='((30)|(31)|([0-2]?[0-9]))';
function isDate(column, rows) {
    var sep='([/-])';
    var dateRegExp = new RegExp('^(('+year+sep+mon+'\\3'+day+')|('+day+sep+mon+'\\13'+year+')|('+mon+sep+day+'\\15'+year+'))$');
    return evaluateColumn(column, rows, dateRegExp);
}
function isTimestamp(column, rows) {
    var tsRegExp = new RegExp('^('+year+'-'+mon+'-'+day+' [0-2][0-9]:[0-2][0-9]:[0-2][0-9](\.[0-9]{3})?( [-+]1?[0-9]:[0-5][0-9])?)$');
    return evaluateColumn(column, rows, tsRegExp);
}
function isVarchar(column, rows) {
    return evaluateColumn(column, rows, /.?/);
}
var types = [
    {typeName:'boolean'  , adapt:adaptBoolean, pad:padRight, validates:isBoolean                                                          },
    {typeName:'integer'  , adapt:adaptPlain  , pad:padRight, validates:isInteger                                                          },
    {typeName:'bigint'   , adapt:adaptPlain  , pad:padRight, validates:isBigInteger                                                       },
    {typeName:'numeric'  , adapt:adaptPlain  , pad:padRight, validates:isNumeric    , useLength:true                                      },
    {typeName:'double'   , adapt:adaptPlain  , pad:padRight, validates:isDouble                                                           },
    {typeName:'date'     , adapt:adaptText   , pad:padRight, validates:isDate                                          , isNotNumeric:true},
    {typeName:'timestamp', adapt:adaptText   , pad:padRight, validates:isTimestamp                                     , isNotNumeric:true},
    {typeName:'varchar'  , adapt:adaptText   , pad:padLeft , validates:isVarchar    , useLength:true, isTextColumn:true, isNotNumeric:true},
];

function quoteBackTick(objectName) { return '`'+objectName.replace(/`/g,'``')+'`'; }
// Solo hay que escapar ']' de acuerdo con: https://technet.microsoft.com/en-us/library/ms176027(v=sql.105).aspx
function quoteBracket(objectName) { return '['+objectName.replace(/]/g,']]')+']'; }
function quoteDouble(objectName) { return '"'+objectName.replace(/"/g,'""')+'"'; }

function dropTableIfExists(tableName) { return "drop table if exists "+tableName; }
function dropTable(tableName) { return "drop table "+tableName; }

function alterTableAddPK(quotedTableName, pkName, pkArray) {
    return 'alter table '+quotedTableName+' add constraint '+pkName+' add primary key ('+pkArray.join(',')+')';
}

var engines = {
    'postgresql': {
        fixedTypes:{
            'boolean':{
                adapt:function(val) {
                    var v = adaptBoolean(val);
                    return v==='null' ? v : (v)==='1'?'true':'false';
                }
            },
            'double':{name:'double precision'},
            'varchar':{name:'character varying'}
        },
        quote:quoteDouble,
        dropTable:dropTableIfExists,
        alterTableAddPK:alterTableAddPK
    },
    'mssql': {
        fixedTypes:{
            'boolean':{name:'bit'},
            'double':{name:'real'}
        },
        quote:quoteBracket,
        noCompactInsert:true,
        dropTable:dropTable,
        alterTableAddPK:alterTableAddPK
    },
    'mysql': {
        fixedTypes:{
            'boolean':{name:'tinyint'},
            'double':{name:'double precision'}
        },
        quote:quoteBackTick,
        dropTable:dropTableIfExists,
        alterTableAddPK:alterTableAddPK
    },
    'oracle': {
        fixedTypes:{
            'boolean':{name:'char'},
            'bigint':{name:'long'},
            'numeric':{name:'number'},
            'double':{name:'binary_double'},
            'varchar':{name:'varchar2'}
        },
        quote:quoteDouble,
        noCompactInsert:true,
        dropTable:dropTable,
        alterTableAddPK:alterTableAddPK
    },
    'sqlite': {
        fixedTypes:{
            'bigint':{name:'integer'},
            'double':{name:'real'},
            'varchar':{name:'text'}
        },
        quote:quoteDouble,
        dropTable:dropTableIfExists,
        // http://www.sqlite.org/limits.html#max_compound_select
        compactInsertLimit:500,
        // sqlite no soporta alter table add pk
    }
};

function throwIfErrors(errors) {
    if(errors.length) {
        var e = new Error();
        e.errors = errors;
        throw e;
    }
}

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

txtToSql.validEncodings = ['ASCII7', 'UTF8' , 'ANSI'];
function checkEncodingParam(info, encoding, inOrOut, errors) {
    if(encoding && txtToSql.validEncodings.indexOf(encoding)===-1) {
        errors.push(txtToSql.errString(info, 'errBadEncoding',[inOrOut, encoding]));
    }
}

function getFixedTypes(outputEngine) {
    var engineTypes = types.map(function(type, index) {
        var mapped=outputEngine.fixedTypes[type.typeName];
        return changing(type, mapped?{typeName:mapped.name||type.typeName, adapt:mapped.adapt||type.adapt}:{});
    });
    return engineTypes;
}
function verifyInputParams(info){
    info.opts = changing(txtToSql.defaultOpts, info.opts || {});
    txtToSql.detectBooleans = info.opts.detectBooleans;
    info.messages=txtToSql.dictionary[info.opts.lang];
    var errors=[];
    if(! info.tableName) {
        errors.push(info.messages.errUndefTable);
    }
    if(! info.rawTable) {
        errors.push(info.messages.errNullTable);
    } else if(!(info.rawTable instanceof Buffer)) {
        errors.push(info.messages.errBadBuffer);
    }
    if(! (info.opts.columnNamesFormat in formatFunctions)) {
        errors.push(txtToSql.errString(info, 'errBadFormat',[info.opts.columnNamesFormat]));
    }
    if(! (info.opts.outputEngine in engines)) {
        errors.push(txtToSql.errString(info, 'errOutputEngine',[info.opts.outputEngine]));
    }
    checkEncodingParam(info, info.opts.inputEncoding, 'input', errors);
    checkEncodingParam(info, info.opts.outputEncoding, 'output', errors);
    throwIfErrors(errors);
    info.outputEngine=engines[info.opts.outputEngine];
    info.outputEngine.types = getFixedTypes(info.outputEngine);
    info.quote = info.outputEngine.quote;
    info.transform = function(objectName) { return formatFunctions[info.opts.columnNamesFormat](objectName); };
    info.nameColumn = function(columnInfo) {
        var name = info.quote(columnInfo.name)+" "+columnInfo.typeInfo.typeName;
        if(! columnInfo.typeInfo.useLength) { return name; }
        var scale = parseInt(columnInfo.maxScale!==null?columnInfo.maxScale:0, 10);
        var precision = parseInt(columnInfo.maxLength, 10)+scale+(scale>0?1:0);
        return name + (columnInfo.maxLength<1 ?'':('('+precision+(scale>0 ? ','+scale:'')+')'));
    };
    info.compactInsertLimit = info.opts.compactInsertLimit || info.outputEngine.compactInsertLimit || txtToSql.defaultOpts.compactInsertLimit;
    return info;
}

function getEncoding(buf) {
    // si es un continuador
    function cont(code) { return code>=128 && code<192; }
    function case1(code) { return code>=192 && code<224; }
    function case2(code) { return code>=224 && code<240; }
    function case3(code) { return code>=240 && code<248; }    
    return Promise.resolve().then(function() {
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
                throw new Error(info.messages.errConvRep);
            }
            info.decodedBuffer = iconv.decode(info.rawTable, "win1252");
            if(compareBuffers(info.decodedBuffer, info.rawTable) === -1) {
                throw new Error(info.messages.errConv);
            }
        } else if(info.opts.inputEncoding==='UTF8') {
            info.decodedBuffer = inFromToString;
            var result = compareBuffers(info.rawTable, new Buffer(info.decodedBuffer, 'utf8'));
            if(result !== -1) {
                throw new Error(txtToSql.errString(info, 'errUTF',[result]));
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
            throw new Error(info.messages.errSeparator);
        }
        info.opts.separator=separatorCandidates[0];
    }
    return info;
}

function determineDelimiter(info) {
    var delimiterCandidates = delimiters.split('');
    var headers = info.headers.split(info.opts.separator);
    delimiterCandidates = delimiterCandidates.filter(function(delimiter) {
        return headers.filter(function(header) {
            return header[0]===delimiter && header[header.length-1]===delimiter;
        }).length>0;
    });
    if(delimiterCandidates.length>0) {
        info.delimiter = delimiterCandidates[0];
    }
    return info;
}

function getDelimitedField(info, field) {
    var last = field.length-1;
    var start=field[0]===info.delimiter?1:0,
        end=(last>start && field[last]===info.delimiter) ? last:last+1;
    return field.substring(start, end).replace(new RegExp(info.delimiter+info.delimiter,"g"),info.delimiter);
}

function delimiterSplit(info, line) {
    var del = info.delimiter;
    var sep = info.opts.separator;
    var expressions = [
        del+sep+del,
        sep+del,
        del+sep
    ];
    var splitter=new RegExp(expressions.join('|'));
    return line.split(splitter).map(function(name, index){
        return getDelimitedField(info, name);
    });
}

function separateWithDelimiter(info) {
    return info.headers.split(info.opts.separator).map(function(name, index){
        return {
            name:getDelimitedField(info, name),
            columnLength:0,
        };
    });
}

function separateWithSeparator(info) {
    return info.headers.split(info.opts.separator).map(function(name){ return {
        name:name,
        columnLength:0,
    };});
}

function separateColumns(info){
    info.columnsInfo = info.delimiter ? separateWithDelimiter(info) : separateWithSeparator(info);
    if(info.opts.columns && 'name' in info.opts.columns[0]) {
        if(info.opts.columns.length !== info.columnsInfo.length) {
            throw new Error(txtToSql.errString(info, 'errNumCols',[info.columnsInfo.length,info.opts.columns.length]));
        }
        info.columnsInfo.forEach(function(column, index) {
            column.name = info.opts.columns[index].name;
        });
    }
    return info;
}

function separateOneRow(info, line) {
    if(info.delimiter) {
        return delimiterSplit(info, line);
    } else {
        return line.split(info.opts.separator);
    }
}

txtToSql.fixLines = function fixLines(info, lines) {
    var errors=[];
    var numColumns = info.columnsInfo.length;
    var ln=0;
    var linesJoined=0;
    while(ln<lines.length) {
        var firstLine = separateOneRow(info, lines[ln]);
        var brokenLine = { num: ln, cols:firstLine.length, lines:[lines[ln]] };
        if(brokenLine.cols !== numColumns) {
            ++ln;
            do {
                var separated = separateOneRow(info, lines[ln]);
                if((brokenLine.cols+separated.length-1) <= numColumns) {
                    if(separated.length>1) {
                        brokenLine.cols += separated.length-1;
                    }
                    if(lines[ln].substr(0, info.opts.separator.length) !== info.opts.separator) {
                        brokenLine.lines.push('\n');
                    }
                    brokenLine.lines.push(lines[ln]);
                    ++linesJoined;
                } else {
                    if(brokenLine.lines.length===1) {
                        errors.push(txtToSql.errString(info, 'errBadRow',[ln, firstLine.length, numColumns]));
                    } else {
                        errors.push(txtToSql.errString(info, 'errBadRowMulti', [parseInt(brokenLine.num+linesJoined+1,10),
                                                                                parseInt(ln+linesJoined,10),
                                                                                firstLine.length,
                                                                                numColumns]));
                    }
                    ++ln;
                    break;
                }
                ++ln;
            }
            while(brokenLine.cols<numColumns);
            lines[brokenLine.num] = brokenLine.lines.join('');
            lines.splice(brokenLine.num+1, ln-brokenLine.num-1);
            --ln;
        } else {
            ++ln;
        }
    }
    throwIfErrors(errors);
    return lines;
};

function separateRows(info) {
    info.rows = txtToSql.fixLines(info, info.lines.filter(function(line){ return line.trim()!==""; })).map(function(line){
        return separateOneRow(info, line);
    });
    return info;
}

function transformNames(info) {
    info.quotedTableName = info.transform(info.tableName);
    info.columnsInfo.forEach(function(column){ column.name=info.transform(column.name); });
    return info;
}

function verifyColumnNames(info) {
    var errors=[];
    var namesHash = {};
    info.columnsInfo.forEach(function(columnInfo, columnIndex){
        if(columnInfo.name==="") {
            errors.push(txtToSql.errString(info, 'errColMissing',[columnIndex+1]));
        } else {
            if(columnInfo.name in namesHash) {
                errors.push(txtToSql.errString(info, 'errColDupli',[columnInfo.name]));
            } else {
                namesHash[columnInfo.name] = true;
            }
        }
    });
    throwIfErrors(errors);
    return info;
}

function deduceType(engineTypes, columnIndex, info) {
    var maxTypeIndex=0;
    var typeIndex=0;
    while(! engineTypes[typeIndex].validates(columnIndex, info.rows)) {
        typeIndex++;
    }
    if(typeIndex>maxTypeIndex){ maxTypeIndex=typeIndex; }
    return maxTypeIndex;
}
function selectType(engineTypes, columnIndex, info) {
    var mapTypeIndex;
    engineTypes.some(function(col, colIndex) {
        if(col.typeName === info.opts.columns[columnIndex].type) {
            mapTypeIndex = colIndex;
            return true;
        }
        return false;
    });
    return mapTypeIndex;
}
function determineColumnTypes(info){
    var typeFunction = (! info.opts.columns || ! info.opts.columns[0].type) ? deduceType : selectType;
    info.columnsInfo.forEach(function(columnInfo, columnIndex){
        columnInfo.typeInfo = info.outputEngine.types[typeFunction(info.outputEngine.types, columnIndex, info)];
    });        
    return info;
}

function hasScientificNotation(typeName) { return typeName==='double precision'?false:null; }

function getLengthInfo(val, isNotNumeric) {
    if(isNotNumeric) { return {length:val.length || 0, scale:0}; }
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
        colInfo.maxScale             = setCol(info, 'maxScale', colIndex, colInfo.typeInfo.isNotNumeric?null:0, defaults); // maxima cantidad de decimales
        colInfo.hasNullValues        = setCol(info, 'hasNullValues', colIndex, false, defaults);
        colInfo.hasScientificNotation = setCol(info, 'hasScientificNotation', colIndex, hasScientificNotation(colInfo.typeInfo.typeName), defaults);
    });
    info.rows.forEach(function(row) {
        info.columnsInfo.forEach(function(column, columnIndex) {
            var val=row[columnIndex];
            var lenInfo = getLengthInfo(val, column.typeInfo.isNotNumeric);
            if(! defaults.maxLength && column.maxLength<lenInfo.length) { column.maxLength=lenInfo.length; }
            if(! defaults.maxScale && column.maxScale!==null && column.maxScale<lenInfo.scale) { column.maxScale=lenInfo.scale; }
            if(! defaults.hasNullValues && ! column.hasNullValues && ! val) { column.hasNullValues=true; }
            if(! defaults.hasScientificNotation && column.hasScientificNotation===false && val.match(/[eE]/)) { column.hasScientificNotation=true; }
        });
    });
    return  info;
}

function determinePrimaryKey(info) {
    if(info.opts.includePrimaryKey !== false) {
        var warnings = [];
        var columnsInKey = [];
        var haveCustomKeys = info.columnsInfo.filter(function(col,colIndex) {
            if(haveColumnInfo(info, 'inPrimaryKey', colIndex)) {
                if(info.opts.columns[colIndex].inPrimaryKey===true) {
                    columnsInKey.push(colIndex);
                }
                return true;
            }
            return false;
        });
        if(haveCustomKeys.length>0 && columnsInKey.length===0) {
            warnings.push("includePrimaryKey is on but no columns were selected");
        }
        // no custom keys, using all fields
        if(columnsInKey.length===0) {
            columnsInKey = info.columnsInfo.map(function(col, colIndex) { return colIndex; } );
        }
        try{
            var combinedKeys=new Array(info.rows.length);
            columnsInKey.some(function(column, columnIndex) {
                var hashedKeyCombinations = {};
                info.rows.forEach(function(row, index) {
                    var val = row[column];
                    if(val==='') {
                        throw new Error("haveNullColumns");
                    }
                    combinedKeys[index] = combinedKeys[index]+JSON.stringify(val);
                });
                if(!info.rows.every(function(row, rowIndex) {
                    if(hashedKeyCombinations[combinedKeys[rowIndex]]){
                        return false;
                    }
                    hashedKeyCombinations[combinedKeys[rowIndex]]=true;
                    return true;
                })){
                    return false;
                }else{
                    info.primaryKey = info.columnsInfo.slice(columnsInKey[0],columnsInKey[columnIndex]+1).map(function(col) { return col.name; });
                    return true; 
                }
            });
        }catch(err){
            if(err.message!=="haveNullColumns") { throw err; }
        }
        if(columnsInKey.length>0 && (! info.primaryKey || ! info.primaryKey.length)) {
            var failingColumns = columnsInKey.map(function(col) {
                return info.columnsInfo[col].name;
            });
            warnings.push('requested columns ('+failingColumns.join(', ')+') failed to be a PrimaryKey');
            // we honor user's desire anyway
            if(info.opts.includePrimaryKey) { info.primaryKey = failingColumns; }
        }
        if(warnings.length) { info.warnings = warnings; }
    }
    var primaryKey = info.primaryKey || [];
    info.columnsInfo.forEach(function(columnInfo) {
        columnInfo.inPrimaryKey = primaryKey.indexOf(columnInfo.name) !== -1;
    });
    return info;
}

function quoteNames(info) {
    info.quotedTableName = info.quote(info.quotedTableName);
    if(info.primaryKey) { info.primaryKey = info.primaryKey.map(function(pk) { return info.quote(pk); }); }
    return info;
}

function generateDropTable(info) {
    info.scripts=[];
    if(info.opts.addDropTable) {
        info.scripts.push({type:'drop table', sql: info.outputEngine.dropTable(info.quotedTableName)+';\n'});
    }
    return info;
}

function generateCreateScript(info){
    var scriptLines = [];
    scriptLines.push("create table "+info.quotedTableName+" (");
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

function generateAlterTableAddPK(info) {
    if(info.primaryKey && info.outputEngine.alterTableAddPK) {
        info.scripts.push({type:'add primary key',
                            sql: info.outputEngine.alterTableAddPK(info.quotedTableName,
                                                                   info.quote(info.tableName+'_pk'),
                                                                   info.primaryKey)});
    }
    return info;
}
function removeIgnoredLines(info) {
    if(info.opts.ignoreNullLines) {
        info.rows = info.rows.filter(function(row) {
            return row.filter(function(column) { return column !==''; }).length!==0;
        });
    }
    return info;
}

function createInsertInto(info) {
    return "insert into "+info.quotedTableName+" ("+info.columnsInfo.map(function(columnInfo){
        return info.quote(columnInfo.name);
    }).join(', ')+") values";
}

function createAdaptedRows(info, rows) {
    return rows.map(function(row, rowIndex) {
        return info.columnsInfo.map(function(column, columnIndex) {
            var adaptedValue = column.typeInfo.adapt(row[columnIndex]);
            //var adaptedValue = column.typeInfo.parse(column.typeInfo.adapt(row[columnIndex]));
            if(info.opts.columnAlignedCommas) {
                //console.log(adaptedValue, adaptedValue.length, column.columnLength)
                if(adaptedValue.length>column.columnLength) {
                    column.columnLength = adaptedValue.length; 
                }
            }
            return adaptedValue;
        });
    });
}

function createInsertValues(info, rows) {
    var inserts = [];
    var group = [];
    rows.forEach(function(row, index){
        var owedLength = 0;
        if(info.compactInsertLimit>0 && ! info.outputEngine.noCompactInsert && (index>0 && index % info.compactInsertLimit===0)) {
            inserts.push(group);
            group = [];
        }
        group.push(margin+"("+row.map(function(adaptedValue,columnIndex){
            var column = info.columnsInfo[columnIndex];
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
            // if adaptedValue is not a string, we can recover from that
            return column.typeInfo.pad(column.columnLength-recoveredLength, adaptedValue.length ? adaptedValue : [adaptedValue]);
        }).join(', ')+')');
    });
    inserts.push(group);
    return inserts;
}

function generateInsertScript(info){
    var insertInto = createInsertInto(info);
    var adaptedRows = createAdaptedRows(info, info.rows);
    info.columnsInfo.forEach(function(column){
        column.columnLength = info.opts.columnAlignedCommas?
            Math.min(column.columnLength, info.opts.columnAlignedMaxWidth):0;
    });
    var insertValues = createInsertValues(info, adaptedRows);
    info.scripts.push({
        type:'insert',
        sql:info.outputEngine.noCompactInsert ?
            insertValues.map(function(iv) {
                return iv.map(function(c) {return insertInto + c + ";"; }).join('\n');
            }).join('\n') :
            insertValues.map(function(insertValue) {
                return insertInto + '\n' +insertValue.join(',\n')+';';
            }).join('\n\n')
    });
    return info;
}

function processOutputBuffer(info) {
    var sqls=info.scripts.filter(function(script) { return script.type !=='add primary key'; })
                 .map(function(script) { return script.sql; }).join('\n');
    info.rawSql = info.opts.outputEncoding === 'UTF8'? new Buffer(sqls) : iconv.encode(sqls, "win1252");
    return info;
}

function setup(info) {
    return Promise.resolve(info)
        .then(verifyInputParams)
        .then(processEncodingOptions)
        .then(separateLines)
        .then(determineSeparator)
        .then(determineDelimiter)
        .then(separateColumns)
        .then(separateRows)
        .then(transformNames)
        .then(verifyColumnNames)
        .then(determineColumnTypes)
        .then(determineColumnValuesInfo)
        .then(determinePrimaryKey);
}

function catchErrors(info, err) {
    //console.log("err", err); console.log("err.stack", err.stack); console.log("opts", info.opts)
    var errors = (err.errors || [err.message]);
    var stack = info.opts && info.opts.verboseErrors ? err.stack : null;
    return { errors: errors, opts:info.opts, errorStack:stack};
}

function generatePrepareResult(info) {
    var columns = info.columnsInfo.map(function(columnInfo) {
        var col = changing({type:columnInfo.typeInfo.typeName}, columnInfo);
        delete col.typeInfo;
        delete col.columnLength;
        return col;
    });
    return {
        opts:info.opts,
        columns:columns,
        inputEncodingDetected:info.inputEncoding||null,
        warnings:info.warnings||null
    };
}

function prepare(info) {
    return setup(info)
    .then(generatePrepareResult)
    .catch(catchErrors.bind(null, info));
}

function initializeStats(info) {
    info.stats = {
        startTime:new Date().getTime(),
        lang:info.opts.lang
    };
    return info;
}

function finalizeStats(info) {
    var s = info.stats; // para no usar with
    s.rows = info.rows.length;
    s.columns = info.columnsInfo.length;
    s.textColumns = 0;
    s.nullColumns = 0;
    s.primaryKey = [];
    info.columnsInfo.forEach(function(column, index) {
        if(column.typeInfo.isTextColumn) { ++s.textColumns; }
        if(column.hasNullValues) { ++s.nullColumns; }
        if(column.inPrimaryKey) { s.primaryKey.push(column.name); }
    });
    s.endTime = new Date().getTime();
    return info;
}

txtToSql.capitalize = function capitalize(str) {
    return str.charAt(0).toUpperCase()+str.slice(1);
};

txtToSql.dictionary={
    en:{
        row:'row',
        column:'column',
        text:'text',
        nulls:'nulls',
        pk:'primary key',
        time:'elapsed time',
        errUndefTable:'undefined table name',
        errNullTable:'no rawTable in input',
        errBadBuffer:'info.rawTable must be a Buffer',
        errBadEncoding:"unsupported $1 encoding '$2'",
        errBadFormat:"inexistent column names format '$1'",
        errOutputEngine:"unsupported output engine '$1'",
        errBadRow:'row #$1 has $2 fields, should have $3',
        errBadRowMulti:'row multiline #$1~#$2 has $3 fields, should have $4',
        errColMissing:"missing name for column #$1",
        errColDupli:"duplicated column name '$1'",
        errConvRep:'ansi -> utf8: replacement character not found',
        errConv:'ansi -> utf8: no conversion performed',
        errUTF:'utf8 check failed in position: $1',
        errSeparator:'no separator detected',
        errNumCols:'wrong number of column names: expected $1, obtained $2',
    },
    es:{
        row:'registro',
        column:'columna',
        text:'texto',
        nulls:'nulos',
        pk:'clave primaria',
        time:'tiempo de generación',
        errUndefTable:'nombre de table indefinido',
        errBadBuffer:'info.rawTable debe ser un Buffer',
        errNullTable:'falta rawTable en la entrada',
        errBadEncoding:"encoding de entrada $1 '$2' no soportado",
        errBadFormat:"formato de nombres de columna inexistente '$1'",
        errOutputEngine:"motor de salida no soportado '$1'",
        errBadRow:'registro #$1 tiene $2 campos, debería tener $3',
        errBadRowMulti:'registro multilínea #$1~#$2 tiene $3 campos, debería tener $4',
        errColMissing:"falta nombre para la columna #$1",
        errColDupli:"nombre de columna duplicado '$1'",
        errConvRep:'ansi -> utf8: caracter de reemplazo no encontrado',
        errConv:'ansi -> utf8: no se realizó la conversión',
        errUTF:'verificación utf8 falló en la posición: $1',
        errSeparator:'no se detectó el separador',
        errNumCols:'número de nombres de columna incorrecto: esperados $1, recibidos $2',
    }
};

txtToSql.makeError=function makeError(dictionaryVar, params) {
    var err=JSON.parse(JSON.stringify(dictionaryVar));
    if(0===params.length) { return err; }
    var numParams = err.match(/\d/g);
    if(numParams) {
        for(var p=0; p<numParams.length; ++p) {
            err = err.replace('$'+parseInt(p+1,10), params[p]);
        }
    }
    return err;
};

txtToSql.errString=function errString(info, varName, params) {
    return txtToSql.makeError(txtToSql.dictionary[info.opts.lang][varName], params);
};

function stringizeStats(stats) {
    var messages=txtToSql.dictionary[stats.lang];
    var r=[];
    var time = stats.endTime - stats.startTime;
    var ms = parseInt((time%1000), 10);
    var secs = (((time/1000)%60)).toFixed();
    var mins = (((time/(1000*60))%60)).toFixed();
    var hs = (time/(1000*60*60)).toFixed();
    //console.log("time", time, "ms", ms, "secs", secs, "mins", mins, "hs", hs)
    var t=[];
    if(hs>0) { t.push(hs+'h'); }
    if(mins>0) { t.push(mins+'m'); }
    if(secs>0) { t.push(secs+'s'); }
    if(ms>0) { t.push(ms+'ms'); }
    if(! t.length) { t.push('0ms'); }    
    r.push(txtToSql.capitalize(messages.row)+'s '+stats.rows);
    r.push(messages.column+'s '+stats.columns+' ('+messages.text+'s:'+stats.textColumns+', '+messages.nulls+':'+stats.nullColumns+')');
    if(stats.primaryKey.length) {
        r.push(messages.pk+': '+stats.primaryKey.join(', '));
    }
    return txtToSql.capitalize(messages.time)+' '+t.join(', ')+'. '+ r.join(', ');
}

function generateScripts(info){
    return Promise.resolve(info)
    .then(setup)
    .then(initializeStats)
    .then(quoteNames)
    .then(generateDropTable)
    .then(generateCreateScript)
    .then(generateAlterTableAddPK)
    .then(removeIgnoredLines)
    .then(generateInsertScript)
    .then(processOutputBuffer)
    .then(finalizeStats)
    .catch(catchErrors.bind(null, info));
}

txtToSql.prepare = prepare;
txtToSql.generateScripts = generateScripts;
txtToSql.engines = engines;
txtToSql.getEncoding = getEncoding;
txtToSql.compareBuffers = compareBuffers;

// for --fast
txtToSql.verifyInputParams = verifyInputParams;
txtToSql.getEncoding = getEncoding;
txtToSql.determineSeparator = determineSeparator;
txtToSql.determineDelimiter = determineDelimiter;
txtToSql.separateColumns = separateColumns;
txtToSql.transformNames = transformNames;
txtToSql.verifyColumnNames = verifyColumnNames;
txtToSql.separateOneRow = separateOneRow;
txtToSql.separateRows = separateRows;
txtToSql.determineColumnTypes = determineColumnTypes;
txtToSql.determineColumnValuesInfo = determineColumnValuesInfo;
txtToSql.determinePrimaryKey = determinePrimaryKey;
txtToSql.quoteNames = quoteNames;
txtToSql.generateDropTable = generateDropTable;
txtToSql.generateCreateScript = generateCreateScript;
txtToSql.generateAlterTableAddPK = generateAlterTableAddPK;
txtToSql.generateInsertScript = generateInsertScript;
txtToSql.createAdaptedRows = createAdaptedRows;
txtToSql.createInsertInto = createInsertInto;
txtToSql.createInsertValues = createInsertValues;
txtToSql.generatePrepareResult = generatePrepareResult;
txtToSql.initializeStats = initializeStats;
txtToSql.finalizeStats = finalizeStats;
txtToSql.stringizeStats = stringizeStats;

function createTypeValidations() {
    var validations={};
    var postgresqlTypes = getFixedTypes(engines.postgresql);
    postgresqlTypes.forEach(function(type) {
        validations[type.typeName] = {
            checkOne : function(val) { return type.validates(0, [[val]]); },
            checkArray : type.validates,
            adapt: type.adapt
        };
    });
    return validations;
}
txtToSql.typeValidations = createTypeValidations();

txtToSql.validFormats = Object.keys(formatFunctions);
txtToSql.validEngines = Object.keys(txtToSql.engines);
function createEngineTypes() {
    var et={};
    txtToSql.validEngines.map(function(engine) {
        var eTypes = getFixedTypes(txtToSql.engines[engine]);
        et[engine] = eTypes.map(function(type) { return type.typeName; });
    });
    return et;
}
txtToSql.engineTypes = createEngineTypes();

txtToSql.defaultOpts = {
    columnNamesFormat: 'lowercased_names',
    separator: false,
    detectBooleans: false,
    includePrimaryKey: null,
    columnAlignedCommas: false,
    columnAlignedMaxWidth: 100,
    outputEngine: 'postgresql',
    verboseErrors: false,
    inputEncoding: false,
    outputEncoding: false,
    addDropTable: false,
    ignoreNullLines: false,
    compactInsertLimit:0,
    lang:'en'
};

module.exports = txtToSql;