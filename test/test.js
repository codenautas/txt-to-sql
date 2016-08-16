"use strict";

var fs = require('fs-promise');
var txtToSql = require('../lib/txt-to-sql.js');

var expect = require('expect.js');
var selfExplain = require('self-explain');
var differences = selfExplain.assert.allDifferences;

var yaml = require('js-yaml');

function readIfExists(fileName, outObject, outProperty) {
    return fs.exists(fileName).then(function(exists) {
        if(exists) { return fs.readFile(fileName, {encoding:'utf8'}); }
        return { notExists: true};
    }).then(function(content) {
        if(! content.notExists) { outObject[outProperty] = content; }
    });
}

function makeSqlArray(sqlstr) {
    return sqlstr.split(/(\r?\n){2}/g)
              .filter(function(sql){ return !sql.match(/^(\r?\n)$/); });
}

describe("fixtures", function(){
    [
        {path:'example-one'},
        {path:'pk-simple'},
        {path:'pk-complex'},
        {path:'pk-complex-all'},
        {path:'pk-very-simple'},
        {path:'without-pk-2'},
        {path:'pk-simple-nn'},
        {path:'pk-complex-nn'},
        {path:'pk-complex-nn2'},
        {path:'pk-very-simple2'},
        {path:'pk-space-simple'},
        {path:'fields-lcnames'}, // lowercased_names
        {path:'fields-unmodified'},
    ].forEach(function(fixture){
        if(fixture.skip) {
            it.skip("fixture: "+fixture.path);
        } else {
            it("fixture: "+fixture.path, function(done){
                var param={tableName:fixture.path};
                var result={};
                var basePath='./test/fixtures/'+fixture.path;
                var optsPath=basePath+'.in-opts.yaml';
                readIfExists(basePath+'.in-opts.yaml', param, 'opts').then(function() {
                    if(param.opts) { param.opts = yaml.safeLoad(param.opts); }
                    return readIfExists(basePath+'.txt', param, 'txt');
                }).then(function() {
                    return readIfExists(basePath+'.sql', result, 'sql');
                }).then(function() {
                    result.sql = makeSqlArray(result.sql);
                    return readIfExists(basePath+'.out-opts.yaml', result, 'opts');
                }).then(function() {
                    result.opts = result.opts ? yaml.safeLoad(result.opts) : txtToSql.defaultOpts;
                }).then(function() {
                    // console.log("param", param);
                    // console.log("result", result);
                    return txtToSql.generateScripts(param);
                }).then(function(generated){
                    //console.log("GEN", generated.sql.length, generated.sql); console.log("RES", result.sql.length, result.sql);
                    expect(generated.sql).to.eql(result.sql);
                    expect(differences(generated.sql,result.sql)).to.eql(null);
                    expect(generated.opts).to.eql(result.opts);
               }).then(done,done);
            });   
        }
    });
});

describe("specials", function(){
    it("manage mixed line ends", function(done){
        var txt="text-field;int-field;num-field;big;double\n"+
            "hello;1;3.141592;1234567890;1.12e-101\r\n"+
            ";;;0;0.0";
        Promise.resolve().then(function(){
            return txtToSql.generateScripts({tableName:'example-one', txt:txt});
        }).then(function(generated){
            return fs.readFile('./test/fixtures/example-one.sql', {encoding:'utf8'}).then(function(sql){
                sql = makeSqlArray(sql);
                expect(generated.sql).to.eql(sql);
                expect(differences(generated.sql,sql)).to.eql(null);
                return;
            });
        }).then(done,done);
    });
});

describe("exceptions", function(){
    it("should reject wrong separator", function(done){
        Promise.resolve().then(function(){
            var txt="text-field_int-field_num-field_big_double\n"+
                "hello_1\r3.141592_1234567890_1.12e-101\r\n"+
                "___0_0.0";
            return txtToSql.generateScripts({tableName:'unimportant', txt:txt});
        }).then(function(script){
            done("should fail");
        }).catch(function(err) {
            expect(err.message).to.eql('no separator detected');
            done();
        });
    });
});