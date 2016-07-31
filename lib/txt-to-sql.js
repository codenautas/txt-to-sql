"use strict";

var margin = ' ';
var txtToSql = {};

var separators=';,\t|';

function quote(objectName){
    return '"'+objectName.replace(/"/g,'""')+'"';
}

function adaptPlain(x){ return x; }
function adaptText(x){ return "'"+x.replace(/'/g,"''").replace(/\r/g,"' || chr(10) || '").replace(/\n/g,"' || chr(13) || '")+"'"; }

var typePatterns = [
    {typeName:'integer'         , adapt:adaptPlain, dataPattern: /^-?[0-9]{1,5}$/},
    {typeName:'bigint'          , adapt:adaptPlain, dataPattern: /^-?[0-9]+$/},
    {typeName:'numeric'         , adapt:adaptPlain, dataPattern: /^-?[0-9]+\.?[0-9]*$/},
    {typeName:'double precision', adapt:adaptPlain, dataPattern: /^-?[0-9]+\.?[0-9]*([eE]-?[0-9]+)?$/},
    {typeName:'text'            , adapt:adaptText , dataPattern: /.?/, }
];

function separateData(info){
    var lines = info.txt.split(/\r?\n/);
    var headers = lines.shift();
    var separatorCandidates = separators.split('');
    separatorCandidates.push(/\s+/);
    separatorCandidates = separatorCandidates.filter(function(separator){
        return headers.split(separator).length>1
    });
    if(separatorCandidates.length<=0){
        throw new Error('no separator detected');
    }
    if(separatorCandidates.length>=1){
        console.log('separatorCandidates',separatorCandidates);
    }
    var separator=separatorCandidates[0];
    info.columnNames = headers.split(separator);
    info.columns = [];
    console.log("Columns:");
    info.table = lines
    .map(function(line){ return line.split(separator);})
    .filter(function(row){ return row.length; });
    info.columnNames.forEach(function(columnName, columnIndex){
        var maxTypeIndex=0;
        info.table.forEach(function(row){
            var typeIndex=0;
            if(row[columnIndex]){
                while(!row[columnIndex].match(typePatterns[typeIndex].dataPattern)) typeIndex++;
                if(typeIndex>maxTypeIndex){
                    maxTypeIndex=typeIndex;
                }
            }
        });
        info.columns[columnIndex]={type:typePatterns[maxTypeIndex]};
    });
    return info;
}

function generateCreateScript(info){
    var scriptLines = [];
    scriptLines.push("create table "+quote(info.tableName)+" (");
    var scriptLinesForTableColumns = [];
    info.columnNames.forEach(function(columnName, columnIndex){
        scriptLinesForTableColumns.push(margin+quote(columnName)+" "+info.columns[columnIndex].type.typeName);
    });
    scriptLines.push(scriptLinesForTableColumns.join(",\n"));
    scriptLines.push(');\n');
    info.scripts=[];
    info.scripts.push({type:'create table', sql: scriptLines.join('\n')});
    return info;
}

function generateInsertScript(info){
    var scriptLines = [];
    info.scripts.push({type:'insert', sql:
        "insert into "+quote(info.tableName)+" ("+info.columnNames.map(quote).join(', ')+") values\n"+
        info.table.map(function(row){
            return margin+"("+row.map(function(value,columnIndex){
                return info.columns[columnIndex].type.adapt(value);
            }).join(', ')+")";
        }).join(",\n")+";"
    });
    return info;
}

function generateScripts(info){
    return Promise.resolve(info)
    .then(separateData)
    .then(generateCreateScript)
    .then(generateInsertScript)
    .then(function(info){
        return info.scripts.map(function(script){ return script.sql; }).join('\n');
    });
}

txtToSql.generateScripts = generateScripts;

module.exports = txtToSql;