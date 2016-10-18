"use strict";

var fs = require('fs-promise');
var txtToSql = require('../lib/txt-to-sql.js');
var txtToSqlFast = require('../bin/fast.js');
var expect = require('expect.js');
var selfExplain = require('self-explain');
var differences = selfExplain.assert.allDifferences;
var changing = require('best-globals').changing;
var yaml = require('js-yaml');
var stream = require('stream');
var util = require('util');
var common = require('./test-common');

function TestStream () {
  stream.Writable.call(this);
  this.lines = [];
};
util.inherits(TestStream, stream.Writable);

TestStream.prototype._write = function (chunk, encoding, done) {
  this.lines.push(chunk.toString());
  done();
}

var fastBufferingThreshold = 2;

var originalEngines = {};

describe("fast-fixtures", function(){
    before(function() {
       originalEngines = JSON.parse(JSON.stringify(txtToSql.engines));
       for(var name in txtToSql.engines) {
           var engine = txtToSql.engines[name];
           if(!engine.noCompactInsert) {
               engine.noCompactInsert = true;
           }
       }
    });
    [
        {path:'mssql-example-one'},
        {path:'oracle-example-one'},
        {path:'mssql-comma-align', skip:true},
        {path:'mssql-with-drop-table', skip:true},
        {path:'oracle-with-drop-table', skip:true},
    ].forEach(function(fixture){
        if(fixture.skip) {
            it.skip("fixture: "+fixture.path);
        } else {
            it("fixture: "+fixture.path, function(done){
                this.timeout(5000);
                var defaultOpts = {inputEncoding:'UTF8', outputEncoding:'UTF8'};
                var param={tableName:fixture.path};
                var expected={};
                var basePath='./test/fixtures/'+fixture.path;
                var prepared;
                var generated = new TestStream();
                txtToSql.noCompactInsert = true;
                common.setIfFileExists(basePath+'.in-opts.yaml', param, 'opts').then(function() {
                    if(param.opts) {
                        param.opts = changing(defaultOpts, yaml.safeLoad(param.opts));
                    } else {
                        param.opts = defaultOpts;
                    }
                    return common.setIfFileExists(basePath+'.txt', param, 'rawTable', {});
                }).then(function() {
                    return common.loadDefaultExpectedResult();
                }).then(function() {
                    return common.loadYamlIfFileExists(basePath+'.result.yaml');
                }).then(function(yml) {
                    expected = changing(JSON.parse(JSON.stringify(common.defaultExpectedResult)), yml);
                    if(param.opts.outputEncoding !== null && param.opts.outputEncoding !== 'UTF8') {
                        console.log("OE", param.opts.outputEncoding)
                        throw new Error('Unhandled output test! Re-think next setIfFileExists() line!!');
                    }
                    return common.setIfFileExists(basePath+'.sql', expected, 'rawSql', {});
                }).then(function() {
                    if(fixture.changeExpected) { fixture.changeExpected(expected); }
                }).then(function() {
                    return txtToSqlFast.doFast(param, basePath, fastBufferingThreshold, generated);
                }).then(function(){
                    var gen = generated.lines.join('');
                    var exp = expected.rawSql.toString();
                    //console.log("GEN '"+gen+"'"); console.log("EXP '"+exp+"'")
                    expect(gen).to.eql(exp);
               }).then(done,done);
            });
        }
    });
    after(function() {
       for(var name in txtToSql.engines) {
            var engine = txtToSql.engines[name];
            var ori = originalEngines[name].noCompactInsert;
            var mod = engine.noCompactInsert;
            if(ori && !mod) {
                engine.noCompactInsert = true;
            } else if(!ori && mod) {
                delete engine.noCompactInsert;
            }
       }
    });
});
