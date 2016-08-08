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
        // console.log('separatorCandidates',separatorCandidates);
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
    var columnValues = [];
    info.columnsInfo.every(function(column, colIndex) {
        var vals = [];
        info.rows.every(function(row, rowIndex) {
            var v = info.rows[rowIndex][colIndex] || null;
            if(! v) { return false; }
            vals.push(v)
            return true;
        });
        if(vals.length !== info.rows.length) { return false; }
        columnValues.push(vals);
        return true;
    });
    if(columnValues.length) {
        function hasUniqueKeys(arr, requiredNumberOfKeys) {
            var hashTable = {};
            arr.forEach(function(elem) { hashTable[elem]=true; });
            //console.log("requiredNumberOfKeys", requiredNumberOfKeys, "OK", Object.keys(hashTable).length)
            if(Object.keys(hashTable).length !== requiredNumberOfKeys) { return false; }
            return true;
        }
        var firstUK = -1;
        columnValues.every(function(column, index) {
            var huk = hasUniqueKeys(column, info.rows.length, index);
            if(huk && firstUK == -1) {
                firstUK = index;
                return false;
            }
            return true;
        });
        if(firstUK == -1) {
            // espera que arr1 y arr2 tengan la misma cantidad de elementos
            function concatArrayVals(arr1, arr2) {
                return arr1.map(function(elem, index) {
                   return elem+info.separator+arr2[index];
                });
            }
            var compKeys=columnValues[0];
            columnValues.every(function(column, colIndex) {
                var nextIndex = colIndex +1;
                if(nextIndex>=columnValues.length) { return false; }
                compKeys = concatArrayVals(compKeys, columnValues[nextIndex]);
                if(hasUniqueKeys(compKeys, info.rows.length)) {
                    firstUK = nextIndex;
                    return false;
                }
                return true;
            });
        }
        var primaryKeys=[];
        if(firstUK != -1) {
            info.columnsInfo.every(function(col, index) {
                if(index <= firstUK) {
                    primaryKeys.push(quote(col.name));
                    return true;
                }
                return false;
            });
        }
        if(primaryKeys.length) {
            info.primaryKey = margin+'primary key ('+primaryKeys.join(', ')+')';
        }
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