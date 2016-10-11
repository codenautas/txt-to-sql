#!/usr/bin/env node

"use strict";

var program = require('commander');
var txtToSql = require('../lib/txt-to-sql.js');
var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');
var miniTools = require('mini-tools');
var jsYaml = require('js-yaml');

function getOutputDir(inFile) {
    return Promises.start(function() {
        if(!inFile) { throw new Error("null file"); }
        return fs.exists(inFile);
    }).then(function(exists) {
        if(! exists) { throw new Error("'"+inFile+"' does not exists"); }
        return inFile;
    }).then(function(inFile) {
        return Path.dirname(Path.resolve(inFile));
    }).catch(function(err) {
        return Promise.reject(err);
    });
};

program
    .version(require('../package').version)
    .usage('[options] input.txt')
    .option('-i, --input [input.md]', 'Name of the input file')
    .option('-p, --prepare', 'Analyzes input and generates input.yaml')
    //.option('-f, --fast', 'Uses streams to process input')
    //.option('-e, --export-defaults', 'Exports defaults to input-defaults.yaml')
    .parse(process.argv);


if( (""==program.args && !program.input) ){
    program.help();
}

var cmdParams = {};
cmdParams.input = program.input ? program.input : program.args[0];
cmdParams.prepare = program.prepare;
cmdParams.fast = program.fast;
cmdParams.exportDefaults = program.exportDefaults;
// console.log("args", cmdParams /*, program*/);

function readConfigData(configFile) {
    return Promises.start(function() {
        return fs.exists(configFile);
    }).then(function(exists) {
        if(exists) {
            return miniTools.readConfig([configFile]);
        }
        return {invalid:true};
    });
};

function doPrepare(params, inputYaml, create) {
    var res;
    return txtToSql.prepare(params).then(function(result) {
        res = result;
        //console.log("res", res)
        if(create) {
            return fs.writeFile(inputYaml, jsYaml.safeDump(res), {encoding:'utf8'});
        }
    }).then(function() {
        if(create) {
            process.stdout.write("Generated '"+inputYaml+"' with deduced options\n");
        } else {
            process.stdout.write("Not overwriding existing '"+inputYaml+"'\n");
            process.stdout.write("This are the deduced options:'\n"+JSON.stringify(res, null, ' '));
        }
    });
}

function doGenerate(params) {
    return txtToSql.generateScripts(params).then(function(result) {
        console.log("generated", result.scripts)
    });
}

var inputName = Path.basename(cmdParams.input, '.txt');
var params = {};
getOutputDir(cmdParams.input).then(function(dir) {
    var inputBase = Path.resolve(dir, inputName);
    var inputYaml = inputBase+'.yaml';
    console.log("inputYaml", inputYaml)
    var createInputYaml = false;
    return readConfigData(inputYaml).then(function(data) {
        if(data.invalid) {
            createInputYaml = true;
            return readConfigData(inputBase+'.json'); 
        }
        return data;
    }).then(function(data) {
        //console.log("data", data)
        if(! data.invalid) {
            params = data;
        } else {
            params.tableName = inputName;
        }
        return fs.readFile(cmdParams.input);
    }).then(function(rawInput) {
        params.rawTable = rawInput;        
        //console.log("params", params);
        if(cmdParams.prepare) {
            return doPrepare(params, inputYaml, createInputYaml);
        } else {
            doGenerate(params);
        }
    }).catch(function(err){
        process.stderr.write("ERROR\n"+err.stack);
    });
}).catch(function(err) {
    process.stderr.write("ERROR: "+err.message);
    program.help();
});
