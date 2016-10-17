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
    .option('-e, --export-defaults', 'Exports defaults to txt-to-sql-defaults.yaml')
    .parse(process.argv);


if( ((""==program.args && !program.input) && !program.exportDefaults) ){
    program.help();
}

var cmdParams = {};
cmdParams.input = program.input ? program.input : program.args[0];
cmdParams.prepare = program.prepare;
cmdParams.fast = program.fast;
cmdParams.exportDefaults = program.exportDefaults;

// numero de lineas a leer para analizar entrada
var bufferingThreeshold = 50;

function collectExistentFiles(files) {
    var existentFiles = [];
    return Promises.all(files.map(function(file) {
        return fs.exists(file).then(function(exists) {
            if(exists) { existentFiles.push(file); }
        });
    })).then(function() {
        return existentFiles;
    });
};

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

function createParams(params, preparedParams) {
    var res = {
           tableName:params.tableName,
           rawTable:params.rawTable,
           opts: changing(params.opts, preparedParams.opts),
    };
    res.opts.columns = preparedParams.columns;
    return res;
}

function writeConfigYaml(params, inputYaml) {
    var create = false;
    return fs.exists(inputYaml).then(function(exists) {
        create = ! exists;
        if(create) {
            var createdParams = Object.assign({}, params);
            delete createdParams.rawTable;
            return fs.writeFile(inputYaml, jsYaml.safeDump(createdParams), {encoding:'utf8'});
        }
    }).then(function() {
        if(create) {
            process.stdout.write("Generated '"+inputYaml+"' with deduced options\n");
        } else {
            process.stdout.write("Not overwriding existing '"+inputYaml+"'\n");
        }
    });
}

function doPrepare(params, inputYaml) {
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
        res = createParams(params, result);
        return writeConfigYaml(res, inputYaml);
    }).then(function() {
        return res;
    });
}

function doGenerate(params, inputYaml, inputName) {
    var outSQL = inputName+'.sql';
    return doPrepare(params, inputYaml).then(function(preparedParams) {
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
        return info;
    });
}

function fastProcessLine(info, line) {
    if(line && info.lines && info.lines.length<info.fastMaxLines) {
        info.lines.push(line);
    }
}

function fastAnalyzeLines(info) {
    txtToSql.separateRows(info);
    txtToSql.verifyColumnCount(info);
    txtToSql.transformNames(info);
    txtToSql.verifyColumnNames(info);
    txtToSql.determineColumnTypes(info);
    txtToSql.determineColumnValuesInfo(info);
    txtToSql.determinePrimaryKey(info);
    return txtToSql.generatePrepareResult(info);
}

function fastInsert(info, line) {
    var row =  [line].filter(function(ln){ return ln.trim()!==""; })
                     .map(function(ln){ return ln.split(info.opts.separator);});
    var rows = txtToSql.createAdaptedRows(info, row);
    var insertInto = txtToSql.createInsertInto(info);
    return txtToSql.createInsertValues(rows, info.columnsInfo).map(function(c) { return insertInto + c + ";"; }).join('\n');
}

function fastCreateCreate(info) {
    txtToSql.quoteNames(info);
    txtToSql.generateDropTable(info);
    txtToSql.generateCreateScript(info);
}

function fastFinalize(info, outStream) {
    fastCreateCreate(info);
    //txtToSql.removeIgnoredLines(info);
    txtToSql.generateInsertScript(info);
    //console.log("info", info.scripts)
    info.scripts.forEach(function(script) {
        outStream.write(script.sql);
    });
}

function doFast(params, inputBase) {
    var inStream, outStream;
    var rl;
    var preparedResult;
    return Promise.resolve().then(function() {
        return txtToSql.verifyInputParams(params);
    }).then(fastProcessEncodingOptions)
      .then(function(info) {
        //console.log("info", info);
        inStream = fsSync.createReadStream(inputBase+'.txt', {encoding:'utf8'});
        outStream = fsSync.createWriteStream(inputBase+'.sql', {encoding:'utf8'});
        info.lines = [];
        // maximo de lineas para utilizar procesamiento standard
        info.fastMaxLines = bufferingThreeshold;
        rl = readline.createInterface({
            input: inStream,
            terminal: false
        });
        rl.on('line', function(line) {
            //console.log("line", line);
            if(! info.headers) {
                info.headers = line;
                txtToSql.determineSeparator(info);
                txtToSql.separateColumns(info);
            } else {
                fastProcessLine(info, line);
                if(info.lines) {
                    if(info.lines.length===info.fastMaxLines) {
                        preparedResult = fastAnalyzeLines(info);
                        fastCreateCreate(info);
                        // deben estar drop y create
                        info.scripts.forEach(function(script) {
                            outStream.write(script.sql);
                        });
                        info.lines.forEach(function(ln) {
                            outStream.write(fastInsert(info, ln)+'\n');
                        });
                        delete info.lines;
                    }
                } else { // more than info.fastMaxLines
                    outStream.write(fastInsert(info, line)+'\n');
                }
            }
        });
        rl.on('close', function() {
            if(info.lines && info.lines.length<info.fastMaxLines) {
                fastProcessLine(info);
                preparedResult = fastAnalyzeLines(info);
                fastFinalize(info, outStream);
            }
            //console.log("preparedResult", preparedResult);
            writeConfigYaml(createParams(params, preparedResult), inputBase+'.yaml');
        });
    });
}

var workingDir = Path.resolve('.');
var defYamlName = 'txt-to-sql-defaults.yaml';
var globalBaseDir = Path.dirname(Path.parse(__filename).dir);
var defYaml = Path.resolve(globalBaseDir, 'lib', defYamlName);
var inputName = Path.basename(cmdParams.input, '.txt');
var params = {};

Promises.start(function() {
    if(cmdParams.exportDefaults) {
        var outputDefYaml = Path.resolve(workingDir, defYamlName);
        return fs.copy(defYaml, outputDefYaml).then(function() {
            process.stdout.write("Written '"+outputDefYaml+"'\n");
        });
    } else {
        var inputBase;
        var inputYaml;
        return getOutputDir(cmdParams.input).then(function(outputDir) {
            inputBase = Path.resolve(outputDir, inputName);
            inputYaml = inputBase+'.yaml';
            var configFiles = [
                defYaml,
                Path.resolve(workingDir, defYamlName),
                inputYaml
            ];
            return collectExistentFiles(configFiles);
        }).then(function(existentFiles) {
            return miniTools.readConfig(existentFiles);
        }).then(function(data) {
            params = data.opts;
            if(! params.tableName) {
                params.tableName = inputName;
            }
            return fs.readFile(cmdParams.input);
        }).then(function(rawInput) {
            params.rawTable = rawInput;
            if(cmdParams.fast) {
                return doFast(params, inputBase);
            } else if (cmdParams.prepare) {
                return doPrepare(params, inputYaml);
            } else {
                return doGenerate(params, inputYaml, inputBase);
            }
        });
   }
}).catch(function(err) {
    process.stderr.write("ERROR: "+err.message+"\n"+err.stack);
    program.help();
});
