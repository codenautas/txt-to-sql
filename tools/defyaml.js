"use strict";

var txtToSql = require('../lib/txt-to-sql.js');
var jsYaml = require('js-yaml');
var Promises = require('best-promise');
require('fs-extra');
var fs = require('fs-promise');

var Path = require('path');

function createDefaultYaml() {
    var defaultYaml = Path.resolve('./lib/txt-to-sql-defaults.yaml');
    console.log("Generating '"+defaultYaml+"'...");
    return fs.writeFile(defaultYaml, jsYaml.safeDump({opts:txtToSql.defaultOpts}), {encoding:'utf8'}).then(function() {
        console.log("listo.")
    }).catch(function(err) {
        console.log("Error", err, err.stack);
        process.exit(1);
    });
}

createDefaultYaml();
