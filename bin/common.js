"use strict";

var common = {};

var changing = require('best-globals').changing;
var fs = require('fs-promise');
var jsYaml = require('js-yaml');

common.createParams = function createParams(params, preparedParams) {
    var res = {
       tableName:params.tableName,
       rawTable:params.rawTable,
       opts: changing(params.opts, preparedParams.opts),
    };
    res.opts.columns = params.columns || preparedParams.columns;
    return res;
}

common.writeConfigYaml = function writeConfigYaml(params, inputYaml) {
    var create = false;
    return fs.exists(inputYaml).then(function(exists) {
        create = ! exists;
        if(create) {
            var createdParams = Object.assign({}, params);
            if(! createdParams.opts.columns) { delete createdParams.opts.columns; }
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

module.exports = common;
