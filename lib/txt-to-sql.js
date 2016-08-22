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

var typePatterns = [
    {typeName:'integer'         , adapt:adaptPlain, dataPattern: /^-?[0-9]{1,5}$/},
    {typeName:'bigint'          , adapt:adaptPlain, dataPattern: /^-?[0-9]+$/},
    {typeName:'numeric'         , adapt:adaptPlain, dataPattern: /^-?[0-9]+\.?[0-9]*$/},
    {typeName:'double precision', adapt:adaptPlain, dataPattern: /^-?[0-9]+\.?[0-9]*([eE]-?[0-9]+)?$/},
    {typeName:'text'            , adapt:adaptText , dataPattern: /.?/, }
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
    separator: false
};

function quote(objectName) { return '"'+objectName.replace(/"/g,'""')+'"'; }

var formatFunctions = {
    'unmodified' : function(objectName) { return objectName; },
    'lowercased_names' : function(objectName) { return objectName.toLowerCase(); },
    'lowercased_alpha' : function(objectName) {
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
    if(! formatFunctions.hasOwnProperty(info.opts.fieldFormat)) {
        errors.push("inexistent field format '"+info.opts.fieldFormat+"'");
    }
    throwIfErrors(errors);
    info.format = function(objectName) { return quote(formatFunctions[info.opts.fieldFormat](objectName)); };
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
            return info.headers.split(separator).length>1
        });
        if(separatorCandidates.length<=0){
            throw new Error('no separator detected');
        }
        // if(separatorCandidates.length>=1){
        //    console.log('separatorCandidates',separatorCandidates);
        // }
        info.opts.separator=separatorCandidates[0];
    }// else { console.log("using defined separator ", info.opts.separator); }
    return info;
}

function separateFields(info){
    info.columnsInfo = info.headers.split(info.opts.separator).map(function(name){ return {name:name};});
    info.rows = info.lines
    .filter(function(line){ return line.trim()!==""; })
    .map(function(line){ return line.split(info.opts.separator);});
    return info;
}


function transformNames(info) {
    info.formatedTableName = info.format(info.tableName);
    info.columnsInfo = info.columnsInfo.map(function(column){ return {name:info.format(column.name)}; });
    return info;
}

function verifyColumnNameDuplication(info) {
    var errors=[];
    var namesHash = {};
    info.columnsInfo.forEach(function(columnInfo, columnIndex){
        var quotedName = columnInfo.name;
        if(quotedName in namesHash) {
            errors.push("duplicated field name '"+quotedName+"'");
        } else {
            namesHash[quotedName] = true;
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
                while(!row[columnIndex].match(typePatterns[typeIndex].dataPattern)) typeIndex++;
                if(typeIndex>maxTypeIndex){
                    maxTypeIndex=typeIndex;
                }
            }
        });
        columnInfo.typeInfo=typePatterns[maxTypeIndex];
    });
    return info;
}

function determinePrimaryKey(info) {
    try{
        var combinedKeys=new Array(info.rows.length);
        info.columnsInfo.some(function(column, colIndex) {
            var combinedKeysHash = {};
            if(!info.rows.every(function(row, rowIndex) {
                var val = row[colIndex];
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
                info.primaryKey = info.columnsInfo.slice(0,colIndex+1).map(function(col) {
                    return col.name;
                })
                return true; 
            }
        })
    }catch(err){
        if(err.message!=="haveNullColumns") throw err;
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
    var scriptLines = [];
    info.scripts.push({type:'insert', sql:
        "insert into "+info.formatedTableName+" ("+info.columnsInfo.map(function(columnInfo){
            return columnInfo.name;
        }).join(', ')+") values\n"+
        info.rows.map(function(row){
            return margin+"("+row.map(function(value,columnIndex){
                return info.columnsInfo[columnIndex].typeInfo.adapt(value);
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
    // console.log(err.message); console.log(err.stack);
    return { errors: (err.errors || [err.message]), opts:info.opts };
}

function prepare(info) {
    return setup(info)
    .then(function(info) {
        return {opts:info.opts};
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

txtToSql.prepare = prepare;
txtToSql.generateScripts = generateScripts;

module.exports = txtToSql;