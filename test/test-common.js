"use strict";

var fs = require('fs-promise');
var yaml = require('js-yaml');
var txtToSql = require('../lib/txt-to-sql.js');
var changing = require('best-globals').changing;
var me = {};

me.setIfFileExists = function setIfFileExists(fileName, outObject, outProperty, options) {
    return fs.exists(fileName).then(function(exists) {
        if(exists) { return fs.readFile(fileName, (options || {encoding:'utf8'})); }
        return { notExists: true };
    }).then(function(content) {
        if(! content.notExists) {
            outObject[outProperty] = content;
        }
    });
}

me.loadYamlIfFileExists = function loadYamlIfFileExists(fileName) {
    var res = {};
    return me.setIfFileExists(fileName, res, 'all').then(function() {
        return yaml.safeLoad(res.all || {});
    });
}

me.defaultExpectedResult;

var testDefaultResult = {
    separator:';',
    inputEncoding: 'UTF8',
    outputEncoding: 'UTF8'
};

me.loadDefaultExpectedResult = function loadDefaultExpectedResult() {
    if(! me.defaultExpectedResult) {
        me.defaultExpectedResult = { opts: changing(txtToSql.defaultOpts, testDefaultResult) };
    }
    return Promise.resolve(me.defaultExpectedResult);
}

module.exports = me;