"use strict";

var fs = require('fs-promise');
var yaml = require('js-yaml');

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

me.loadDefaultExpectedResult = function loadDefaultExpectedResult() {
    if(me.defaultExpectedResult) { return Promise.resolve(me.defaultExpectedResult); }
    return me.loadYamlIfFileExists('./test/fixtures/_default_.result.yaml').then(function(yml) {
       me.defaultExpectedResult = yml;
    });
}

module.exports = me;