"use strict";

var fast = {};

var txtToSql = require('../lib/txt-to-sql.js');
var fsSync = require('fs');
var readline = require('readline');

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
    txtToSql.transformNames(info);
    txtToSql.verifyColumnNames(info);
    txtToSql.determineColumnTypes(info);
    txtToSql.determineColumnValuesInfo(info);
    txtToSql.determinePrimaryKey(info);
    return txtToSql.generatePrepareResult(info);
}

function fastInsert(outStream, info, line) {
    if(line.trim() !=='') {
        var row = [txtToSql.separateOneRow(info, line)];
        var adaptedRows = txtToSql.createAdaptedRows(info, row);
        var insertInto = txtToSql.createInsertInto(info);
        var insertValues = txtToSql.createInsertValues(info,adaptedRows);
        var insertLines = insertValues.map(function(iv) {
            return iv.map(function(c) { return insertInto + c + ";"; }).join('\n');
        }).join('\n');
        outStream.write('\n'+insertLines);
    }
}

function fastCreateCreate(info) {
    txtToSql.quoteNames(info);
    txtToSql.generateDropTable(info);
    txtToSql.generateAlterTableAddPK(info);
    txtToSql.generateCreateScript(info);
}

function writeInsertsToStream(scripts, outStream) {
    scripts.forEach(function(script, index) {
        outStream.write(script.sql);
        if((index+1)<scripts.length) {
            outStream.write('\n');
        }
    });
}

function fastFinalize(info, outStream) {
    fastCreateCreate(info);
    //txtToSql.removeIgnoredLines(info);
    txtToSql.generateInsertScript(info);
    writeInsertsToStream(info.scripts, outStream);
}

function streamToPromise(stream) {
    function resolveResult(func) {
        return func({preparedResult:stream.preparedResult, stats:stream.stats});
    }
    return new Promise(function(resolve, reject) {
        var res = resolveResult.bind(undefined, resolve);
        stream.on("close", res);
        stream.on("end", res);
        stream.on("finish", res);
        stream.on("error", res);
    });
}

function doFast(params, inputBase, fastBufferingThreshold, outputStream) {
    var inStream, outStream;
    var rl;
    var preparedResult;
    return Promise.resolve().then(function() {
        return txtToSql.initializeStats(params);
    }).then(txtToSql.verifyInputParams)
      .then(fastProcessEncodingOptions)
      .then(function(info) {
        inStream = fsSync.createReadStream(inputBase+'.txt', {encoding:'utf8'});
        outStream = outputStream || fsSync.createWriteStream(inputBase+'.sql', {encoding:'utf8'});
        info.lines = [];
        // maximo de lineas para utilizar procesamiento standard
        info.fastMaxLines = fastBufferingThreshold;
        rl = readline.createInterface({
            input: inStream,
            terminal: false
        });
        rl.on('line', function(line) {
            if(! info.headers) {
                info.headers = line;
                txtToSql.determineSeparator(info);
                txtToSql.determineDelimiter(info);
                txtToSql.separateColumns(info);
            } else {
                fastProcessLine(info, line);
                if(info.lines) {
                    if(info.lines.length===info.fastMaxLines) {
                        preparedResult = fastAnalyzeLines(info);
                        fastCreateCreate(info);
                        // deben estar drop y create
                        writeInsertsToStream(info.scripts, outStream);
                        info.lines.forEach(function(ln) {
                            fastInsert(outStream, info, ln);
                        });
                        delete info.lines;
                    }
                } else { // more than info.fastMaxLines
                    fastInsert(outStream, info, line);
                }
            }
        });
        rl.on('close', function() {
            if(info.lines && info.lines.length<info.fastMaxLines) {
                fastProcessLine(info);
                preparedResult = fastAnalyzeLines(info);
                fastFinalize(info, outStream);
            }
            preparedResult.scripts = info.scripts;
            rl.preparedResult = preparedResult;
            rl.stats = txtToSql.finalizeStats(info).stats;
            outStream.end();
        });
        return streamToPromise(rl);
    });
}

fast.doFast = doFast;
module.exports = fast;
