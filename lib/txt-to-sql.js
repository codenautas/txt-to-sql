"use strict";

var txtToSql = {};

var margin = ' ';
var separators=';,\t|';

function quote(objectName){
    return '"'+objectName.toLowerCase().replace(/"/g,'""')+'"';
}

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

function separateLines(info){
    info.lines = info.txt.split(/\r?\n/);
    info.headers = info.lines.shift();
    return info;
}

function determineSeparator(info){
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
    info.separator=separatorCandidates[0];
    return info;
}

function separateFields(info){
    info.columnsInfo = info.headers.split(info.separator).map(function(name){ return {name:name};});
    info.rows = info.lines
    .filter(function(line){ return line.trim()!==""; })
    .map(function(line){ return line.split(info.separator);});
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
        var lastValidKeyIndex = -1;
        var combinedKeys=new Array(info.rows.length);
        info.columnsInfo.every(function(column, colIndex) {
            var combinedKeysHash = {};
            info.rows.every(function(row, rowIndex) {
                var val = row[colIndex];
                if(val==='') {
                    throw new Error("haveNullColumns");
                }
                combinedKeys[rowIndex] = combinedKeys[rowIndex]+JSON.stringify(val);
                combinedKeysHash[combinedKeys[rowIndex]]=true;
                return true;
            });
            if(Object.keys(combinedKeysHash).length === info.rows.length) {
                lastValidKeyIndex = colIndex;
                return false;
            }
            return true;
        });
        if(lastValidKeyIndex !== -1) {
            var primaryKeys=[];
            info.columnsInfo.every(function(col, index) {
                if(index <= lastValidKeyIndex) {
                    primaryKeys.push(quote(col.name));
                    return true;
                }
                return false;
            });
            info.primaryKey = margin+'primary key ('+primaryKeys.join(', ')+')';
        }
    }catch(err){
        if(err.message!=="haveNullColumns") throw err;
    }
    return info;
}

function generateCreateScript(info){
    var scriptLines = [];
    scriptLines.push("create table "+quote(info.tableName)+" (");
    var scriptLinesForTableColumns = [];
    info.columnsInfo.forEach(function(columnInfo){
        scriptLinesForTableColumns.push(margin+quote(columnInfo.name)+" "+columnInfo.typeInfo.typeName);
    });
    if(info.primaryKey) { scriptLinesForTableColumns.push(info.primaryKey); }
    scriptLines.push(scriptLinesForTableColumns.join(",\n"));
    scriptLines.push(');\n');
    info.scripts=[];
    info.scripts.push({type:'create table', sql: scriptLines.join('\n')});
    return info;
}

function generateInsertScript(info){
    var scriptLines = [];
    info.scripts.push({type:'insert', sql:
        "insert into "+quote(info.tableName)+" ("+info.columnsInfo.map(function(columnInfo){
            return quote(columnInfo.name);
        }).join(', ')+") values\n"+
        info.rows.map(function(row){
            return margin+"("+row.map(function(value,columnIndex){
                return info.columnsInfo[columnIndex].typeInfo.adapt(value);
            }).join(', ')+")";
        }).join(",\n")+";"
    });
    return info;
}

function generateScripts(info){
    return Promise.resolve(info)
    .then(separateLines)
    .then(determineSeparator)
    .then(separateFields)
    .then(determineColumnTypes)
    .then(determinePrimaryKey)
    .then(generateCreateScript)
    .then(generateInsertScript)
    .then(function(info){
        return info.scripts.map(function(script){ return script.sql; }).join('\n');
    });
}

txtToSql.generateScripts = generateScripts;

module.exports = txtToSql;