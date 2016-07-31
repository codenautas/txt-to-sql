"use strict";

var fs = require('fs-promise');
var Path = require('path');

var TxtToSql = require('./lib/txt-to-sql.js');


function loadText(info){
    return fs.readFile(info.fileName, {encoding: 'utf8'});
}


function txtToSqlMain(fileName, tableName){
    var info={};
    info.fileName=fileName;
    info.tableName=tableName||Path.parse(fileName).name;
    return loadText(info)
    .then(separateData)
    .then(generateCreateScript)
    .then(generateInsertScript)
    .then(function(info){
        return info.scripts.map(function(script){ return script.sql; }).join('\n');
    }).then(function(sqls){
        return fs.writeFile(fileName.replace(/\.txt$/,'.sql'),sqls);
    });
}




Promise.all([
    generateScripts("eah2015_usuarios_hog.txt"),
    generateScripts("eah2015_usuarios_ind.txt"),
]).then(function(infoList){
    console.log(infoList.map(function(info){ 
        return info.scripts.map(function(script){ return script.sql; }).join('\n');
    }).join('\n'))
}).catch(function(err){
    console.log(err, err.stack)
});

module.exports = txtToSqlMain