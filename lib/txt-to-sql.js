"use strict";

var txtToSql = {};

var changing = require('best-globals').changing;    

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

function padNone(columnLength, val) { return val; }
function filling(columnLength, val) { return val.length>=columnLength?'':new Array(columnLength - val.length + 1).join(' '); }
function padLeft(columnLength, val) { return val+filling(columnLength, val); }
function padRight(columnLength, val) { return filling(columnLength,val)+val; }

var typePatterns = [
    {typeName:'integer'         , adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]{1,5}$/},
    {typeName:'bigint'          , adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+$/},
    {typeName:'numeric'         , adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+\.?[0-9]*$/},
    {typeName:'double precision', adapt:adaptPlain, pad:padRight, dataPattern:/^-?[0-9]+\.?[0-9]*([eE]-?[0-9]+)?$/},
    {typeName:'text'            , adapt:adaptText , pad:padLeft , dataPattern:/.?/}
];

function throwIfErrors(errors) {
    if(errors.length) {
        var e = new Error();
        e.errors = errors;
        throw e;
    }
}

txtToSql.defaultOpts = {
    fieldFormat: 'lowercased_names',
    separator: false,
    includePrimaryKey: true,
    columnAlignedCommas: false,
    columnAlignedMaxWidth: 100,
};

function quote(objectName) { return '"'+objectName.replace(/"/g,'""')+'"'; }

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

function verifyInputParams(info){
    info.opts = changing(txtToSql.defaultOpts, info.opts || {});
    var errors=[];
    if(! info.tableName) { errors.push('undefined table name'); }
    if(! info.txt) { errors.push('no txt in input'); }
    if(! (info.opts.fieldFormat in formatFunctions)) {
        errors.push("inexistent field format '"+info.opts.fieldFormat+"'");
    }
    throwIfErrors(errors);
    info.transform = function(objectName) { return quote(formatFunctions[info.opts.fieldFormat](objectName)); };
    return info;
}

function separateLines(info){
    info.lines = info.txt.split(/\r?\n/);
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

function separateFields(info){
    info.columnsInfo = info.headers.split(info.opts.separator).map(function(name){ return {
        name:name,
        columnLength:0,
    };});
    info.rows = info.lines
    .filter(function(line){ return line.trim()!==""; })
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
            errors.push("duplicated field name '"+columnInfo.name+"'");
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
                while(!row[columnIndex].match(typePatterns[typeIndex].dataPattern)) { typeIndex++; }
                if(typeIndex>maxTypeIndex){
                    maxTypeIndex=typeIndex;
                }
            }
        });
        columnInfo.typeInfo = typePatterns[maxTypeIndex];
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

function generateCreateScript(info){
    var scriptLines = [];
    scriptLines.push("create table "+info.formatedTableName+" (");
    var scriptLinesForTableColumns = [];
    info.columnsInfo.forEach(function(columnInfo){
        scriptLinesForTableColumns.push(margin+columnInfo.name+" "+columnInfo.typeInfo.typeName);
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
        .then(separateLines)
        .then(determineSeparator)
        .then(separateFields)
        .then(transformNames)
        .then(verifyColumnNameDuplication)
        .then(determineColumnTypes)
        .then(determinePrimaryKey);
}

function catchErrors(info, err) {
    //console.log("err", err); console.log("err.stack", err.stack)
    return { errors: (err.errors || [err.message]), opts:info.opts};
}

function getLengthInfo(val, typeName) {
    val = val || '';
    if(typeName==='text') { return {length:val.length}; }
    var num = val.split('.');
    return {precision:num[0].length, scale:num[1]?num[1].length:0};
}

function prepare(info) {
    return setup(info)
    .then(function(info) {
        var headers = info.headers.split(info.opts.separator);
        var primaryKey = info.primaryKey || [];
        var columns = info.columnsInfo.map(function(columnInfo) {
            return {name:columnInfo.name,
                    type:columnInfo.typeInfo.typeName,
                    inPrimaryKey:primaryKey.indexOf(columnInfo.name) !== -1,
                    maxLength:0,
                    hasNullValues:false,
                    maxScale:columnInfo.typeInfo.typeName!=='text'?0:null, // maxima cantidad de decimales
                    hasCientificNotation:columnInfo.typeInfo.typeName==='double precision'?false:null
                   };
        });
        info.rows.forEach(function(row) {
            info.columnsInfo.forEach(function(column, columnIndex) {
                var lenInfo = getLengthInfo(row[columnIndex], column.typeInfo.typeName);
                var len = lenInfo.length || lenInfo.precision;
                var col = columns[columnIndex];
                if(col.maxLength<len) { col.maxLength=len; }
                if(! col.hasNullValues && ! row[columnIndex]) { col.hasNullValues=true; }
                if(lenInfo.scale && col.maxScale && col.maxScale < lenInfo.scale) { col.maxScale=lenInfo.scale; }
                if(col.hasCientificNotation===false && row[columnIndex].match(/[eE]/)) { col.hasCientificNotation=true; }
            });
        });
        return {opts:info.opts, columns:columns};
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

txtToSql.getLengthInfo = getLengthInfo;
txtToSql.prepare = prepare;
txtToSql.generateScripts = generateScripts;

module.exports = txtToSql;