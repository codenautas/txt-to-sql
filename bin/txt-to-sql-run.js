#!/usr/bin/env node

"use strict";

var program = require('commander');
var multilang = require('../lib/txt-to-sql.js');
var Promises = require('best-promise');
var fs = require('fs-promise');
var path = require('path');
var miniTools = require('mini-tools');

function realPath(inFile) {
    return Promises.start(function() {
        if(!inFile) { throw new Error("null file"); }
        return fs.exists(inFile);
    }).then(function(exists) {
        if(! exists) { throw new Error("'"+inFile+"' does not exists"); }
        return inFile;
    }).then(function(inFile) {
        return path.dirname(path.resolve(inFile));
    }).catch(function(err) {
        return Promise.reject(err);
    });
};

program
    .version(require('../package').version)
    .usage('[options] input.txt')
    .option('-i, --input [input.md]', 'Name of the input file')
    .option('-p, --prepare', 'Analyzes input and generates input.yaml')
    .option('-f, --fast', 'Uses streams to process input')
    .option('-e, --export-defaults', 'Exports defaults to input-defaults.yaml')
    .parse(process.argv);


if( (""==program.args && !program.input) ){
    program.help();
}

var params = {};
params.input = program.input ? program.input : program.args[0];
params.prepare = program.prepare;
params.fast = program.fast;
params.exportDefaults = program.exportDefaults;

console.log("args", params /*, program*/);
/*
realPath(params.input).then(function(dir) {
    params.directory = dir;
    multilang.main(params).then(function(){
        if(! params.silent) { process.stderr.write(doneMsg); }
    }).catch(function(err){
        process.stderr.write("ERROR\n"+err.stack);
    });
}).catch(function(err) {
    process.stderr.write("ERROR: "+err.message);
    program.help();
});
*/
