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

function adaptText(x){
    if(x===''){ return 'null'; }
    return "'"+x.replace(/'/g,"''").replace(/\r/g,"\\r").replace(/\n/g,"\\n")+"'"; 
    //return "'"+x.replace(/'/g,"''")+"'";
}

function filling(columnLength, val) { return val.length>=columnLength?'':new Array(columnLength - val.length + 1).join(' '); }
function padLeft(columnLength, val) { return val+filling(columnLength, val); }
function padRight(columnLength, val) { return filling(columnLength,val)+val; }

var types = [
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]{1,5}$/},                                      // integer
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+$/},                                          // bigint
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+\.?[0-9]*$/,                 useLength:true}, // numeric
    {adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+\.?[0-9]*([eE]-?[0-9]+)?$/},                  // double precision
    {adapt:adaptText , pad:padLeft , dataPattern:/.?/,                                  useLength:true, isTextColumn:true}  // character varying
];

function mapTypes(typeNames) {
    return typeNames.map(function(type, index) { return changing({typeName:type}, types[index]); });
}

function quoteBackTick(objectName) { return '`'+objectName.replace(/`/g,'``')+'`'; }
// Solo hay que escapar ']' de acuerdo con: https://technet.microsoft.com/en-us/library/ms176027(v=sql.105).aspx
function quoteBracket(objectName) { return '['+objectName.replace(/]/g,']]')+']'; }
function quoteDouble(objectName) { return '"'+objectName.replace(/"/g,'""')+'"'; }

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
        dropTable:dropTableIfExists,
        // http://www.sqlite.org/limits.html#max_compound_select
        compactInsertLimit:500
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

function checkEncodingParam(encoding, inOrOut, errors) {
    if(encoding && ! encoding.match(/^(ASCII7|UTF8|ANSI)$/)) {
        errors.push("unsupported "+inOrOut+" encoding '"+encoding+"'");
    }
}

function verifyInputParams(info){
    info.opts = changing(txtToSql.defaultOpts, info.opts || {});
    var errors=[];
    if(! info.tableName) { errors.push('undefined table name'); }
    if(! info.rawTable) {
        errors.push('no rawTable in input');
    } else if(!(info.rawTable instanceof Buffer)) {
        errors.push('info.rawTable must be an Buffer');
    }
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
    info.quote = info.outputEngine.quote;
    info.transform = function(objectName) { return formatFunctions[info.opts.columnNamesFormat](objectName); };
    info.nameColumn = function(columnInfo) {
        var name = info.quote(columnInfo.name)+" "+columnInfo.typeInfo.typeName;
        if(! columnInfo.typeInfo.useLength) { return name; }
        var scale = parseInt(columnInfo.maxScale!==null?columnInfo.maxScale:0);
        var precision = parseInt(columnInfo.maxLength)+scale+(scale>0?1:0);
        return name + (columnInfo.maxLength<1 ?'':('('+precision+(scale>0 ? ','+scale:'')+')'));
    };
    info.compactInsertLimit = info.opts.compactInsertLimit || info.outputEngine.compactInsertLimit || txtToSql.defaultOpts.compactInsertLimit;
    return info;
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
    return Promise.resolve().then(function() {
        return getEncodingSinc(buf);
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

function determineDelimiter(info) {
    var delimiterCandidates = delimiters.split('');
    var headers = info.headers.split(info.opts.separator);
    delimiterCandidates = delimiterCandidates.filter(function(delimiter) {
        return headers.filter(function(header) {
            return header[0]===delimiter && header[header.length-1]===delimiter;
        }).length>0;
    });
    //console.log("delimiter", delimiterCandidates)
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
            throw new Error('wrong number of column names: expected '+
                            info.columnsInfo.length+
                            ', obtained '+info.opts.columns.length);
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

function separateRows(info) {
    info.rows = info.lines.filter(function(line){ return line.trim()!==""; })
                          .map(function(line){ return separateOneRow(info, line); });
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
    info.quotedTableName = info.transform(info.tableName);
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
                errors.push("duplicated column name '"+columnInfo.name+"'");
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
            if(info.opts.columnAlignedCommas) {
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
        if(info.compactInsertLimit>0 && ! info.outputEngine.noCompactInsert && index === info.compactInsertLimit) {
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
            return column.typeInfo.pad(column.columnLength-recoveredLength, adaptedValue);
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
        .then(determineDelimiter)
        .then(separateColumns)
        .then(separateRows)
        .then(verifyColumnCount)
        .then(transformNames)
        .then(verifyColumnNames)
        .then(determineColumnTypes)
        .then(determineColumnValuesInfo)
        .then(determinePrimaryKey);
}

function catchErrors(info, err) {
    //console.log("err", err); console.log("err.stack", err.stack); console.log("opts", info.opts)
    var errors = (err.errors || [err.message]);
    if(info.opts.verboseErrors) { errors.push(err.stack); }
    return { errors: errors, opts:info.opts};
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
        startTime:new Date().getTime()
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

function stringizeStats(stats) {
    var s=[];
    s.push('rows:'+stats.rows);
    s.push('columns:'+stats.columns+' (text:'+stats.textColumns+', null:'+stats.nullColumns+')');
    if(stats.primaryKey.length) {
        s.push('primary key:'+stats.primaryKey.join(','));
    }
    return s.join(', ');
}

function generateScripts(info){
    return Promise.resolve(info)
    .then(initializeStats)
    .then(setup)
    .then(quoteNames)
    .then(generateDropTable)
    .then(generateCreateScript)
    .then(removeIgnoredLines)
    .then(generateInsertScript)
    .then(processOutputBuffer)
    .then(finalizeStats)
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
txtToSql.verifyColumnCount = verifyColumnCount;
txtToSql.determineColumnTypes = determineColumnTypes;
txtToSql.determineColumnValuesInfo = determineColumnValuesInfo;
txtToSql.determinePrimaryKey = determinePrimaryKey;
txtToSql.quoteNames = quoteNames;
txtToSql.generateDropTable = generateDropTable;
txtToSql.generateCreateScript = generateCreateScript;
txtToSql.removeIgnoredLines = removeIgnoredLines;
txtToSql.generateInsertScript = generateInsertScript;
txtToSql.createAdaptedRows = createAdaptedRows;
txtToSql.createInsertInto = createInsertInto;
txtToSql.createInsertValues = createInsertValues;
txtToSql.generatePrepareResult = generatePrepareResult;
txtToSql.initializeStats = initializeStats;
txtToSql.finalizeStats = finalizeStats;
txtToSql.stringizeStats = stringizeStats;

txtToSql.engines = engines;

txtToSql.defaultOpts = {
    columnNamesFormat: 'lowercased_names',
    separator: false,
    includePrimaryKey: null,
    columnAlignedCommas: false,
    columnAlignedMaxWidth: 100,
    outputEngine: 'postgresql',
    verboseErrors: false,
    inputEncoding: false,
    outputEncoding: false,
    addDropTable: false,
    ignoreNullLines: false,
    compactInsertLimit:0
};

module.exports = txtToSql;