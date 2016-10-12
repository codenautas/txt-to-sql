#!/usr/bin/env node

"use strict";

var program = require('commander');
var txtToSql = require('../lib/txt-to-sql.js');
var Promises = require('best-promise');
var fs = require('fs-promise');
var fsSync = require('fs');
var Path = require('path');
var miniTools = require('mini-tools');
var jsYaml = require('js-yaml');
var changing = require('best-globals').changing;
var readline = require('readline');

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
    .option('-i, --input', 'Name of the input file')
    .option('-p, --prepare', 'Analyzes input and generates input.yaml')
    .option('-f, --fast', 'Uses streams to process input')
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
    // PARCHE hasta resolver #16
    if(params.opts) {
        if(params.opts.columns) {
            params.opts.includePrimaryKey = params.opts.columns.filter(function(col) {
                return col.inPrimaryKey === true;
            }).length>0;
        }
    } else {
        params.opts = { disablePrimaryKeyBug: true };
    }
    // fin PARCHE
    var res;
    return txtToSql.prepare(params).then(function(result) {
        if(result.errors) { throw new Error(result.errors); }
        res = {
           tableName:params.tableName,
           rawTable:params.rawTable,
           opts: changing(params.opts, result.opts),
        };
        res.opts.columns = result.columns;
        if(create) {
            return fs.writeFile(inputYaml, jsYaml.safeDump(res), {encoding:'utf8'});
        }
    }).then(function() {
        if(create) {
            process.stdout.write("Generated '"+inputYaml+"' with deduced options\n");
        } else {
            process.stdout.write("Not overwriding existing '"+inputYaml+"'\n");
        }
        return res;
    });
}

function doGenerate(params, inputYaml, create, inputName) {
    var outSQL = inputName+'.sql';
    return doPrepare(params, inputYaml, create).then(function(preparedParams) {
        return txtToSql.generateScripts(preparedParams);
    }).then(function(result) {
        if(result.errors) { throw new Error(result.errors); }
        return fs.writeFile(outSQL, result.rawSql);
    }).then(function() {
        process.stdout.write("Generated '"+outSQL+"'")
    });
}

function fastProcessEncodingOptions(info) {
    return txtToSql.getEncoding(info.rawTable).then(function(encoding) {
        info.inputEncodingDetected = encoding;
        if(! info.opts.inputEncoding) { info.opts.inputEncoding = info.inputEncodingDetected; }
        if(! info.opts.outputEncoding) { info.opts.outputEncoding = info.inputEncodingDetected; }
        //var inFromToString = info.rawTable.toString("utf8");
        if(info.opts.inputEncoding==='ANSI') {
            // if(inFromToString.substr(1).indexOf('\uFFFD')<0) {
                // throw new Error('ansi -> utf8: replacement character not found');
            // }
            //info.decodedBuffer = iconv.decode(info.rawTable, "win1252");
            // if(txtToSql.compareBuffers(info.decodedBuffer, info.rawTable) === -1) {
                // throw new Error('ansi -> utf8: no conversion performed');
            // }
        } else if(info.opts.inputEncoding==='UTF8') {
            //info.decodedBuffer = inFromToString;
            // var result = txtToSql.compareBuffers(info.rawTable, new Buffer(info.decodedBuffer, 'utf8'));
            // if(result !== -1) {
                // throw new Error('utf8 check failed in position: '+result);
            // }
        } else {
            //info.decodedBuffer = inFromToString;
        }
        return info;
    });
}

function doFast(params, inputBase) {
    var inStream, outStream;
    var rl;
    return Promise.resolve().then(function() {
        return txtToSql.verifyInputParams(params);
    }).then(fastProcessEncodingOptions)
      .then(function(info) {
        //console.log("info", info);
        inStream = fsSync.createReadStream(inputBase+'.txt', {encoding:'utf8'});
        outStream = fsSync.createWriteStream(inputBase+'.sql', {encoding:'utf8'});
        rl = readline.createInterface({
            input: inStream,
            terminal: false
        });
        rl.on('line', function(line) {
            console.log("line", line);
            if(! info.headers) {
                info.headers = line;
                txtToSql.determineSeparator(info);
                txtToSql.separateColumns(info);
            } else {
                
            }
            //outStream.write(line+'\n')
        });
        rl.on('close', function() {
          console.log("info", info);  
        });
    });
}

var inputName = Path.basename(cmdParams.input, '.txt');
var params = {};
getOutputDir(cmdParams.input).then(function(dir) {
    var inputBase = Path.resolve(dir, inputName);
    var inputYaml = inputBase+'.yaml';
    var createInputYaml = false;
    return readConfigData(inputYaml).then(function(data) {
        if(data.invalid) {
            createInputYaml = true;
            return readConfigData(inputBase+'.json'); 
        }
        return data;
    }).then(function(data) {
        if(! data.invalid) {
            params = data;
        } else {
            params.tableName = inputName;
        }
        return fs.readFile(cmdParams.input);
    }).then(function(rawInput) {
        params.rawTable = rawInput;
        if(cmdParams.fast) {
            return doFast(params, inputBase);
        } else if (cmdParams.prepare) {
            return doPrepare(params, inputYaml, createInputYaml);
        } else {
            return doGenerate(params, inputYaml, createInputYaml, inputBase);
        }
    }).catch(function(err){
        process.stderr.write("ERROR\n"+err.stack);
    });
}).catch(function(err) {
    process.stderr.write("ERROR: "+err.message);
    program.help();
});
