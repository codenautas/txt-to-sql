"use strict";

var common = {};

var changing = require('best-globals').changing;
var fs = require('fs-promise');
var jsYaml = require('js-yaml');

common.streamToPromise = function streamToPromise(stream) {
    return new Promise(function(resolve, reject) {
        stream.on("end", function() { resolve() });
        stream.on("finish", function() { resolve() });
        stream.on("error", function(e) { reject(e); });
    });
}

module.exports = common;
