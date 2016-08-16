"use strict";

var fs = require('fs-promise');
var txtToSql = require('../lib/txt-to-sql.js');
var expect = require('expect.js');
var selfExplain = require('self-explain');
var differences = selfExplain.assert.allDifferences;
var changing = require('best-globals').changing;
var yaml = require('js-yaml');

function setIfFileExists(fileName, outObject, outProperty) {
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
        {path:'fields-lcalpha'},
        {path:'specials'},
    ].forEach(function(fixture){
        if(fixture.skip) {
            it.skip("fixture: "+fixture.path);
        } else {
            it("fixture: "+fixture.path, function(done){
                var param={tableName:fixture.path};
                var result={};
                var basePath='./test/fixtures/'+fixture.path;
                setIfFileExists(basePath+'.in-opts.yaml', param, 'opts').then(function() {
                    if(param.opts) { param.opts = yaml.safeLoad(param.opts); }
                    return setIfFileExists(basePath+'.txt', param, 'txt');
                }).then(function() {
                    return setIfFileExists(basePath+'.sql', result, 'sql');
                }).then(function() {
                    result.sql = makeSqlArray(result.sql);
                    return setIfFileExists(basePath+'.out-opts.yaml', result, 'opts');
                }).then(function() {
                    result.opts = changing(txtToSql.defaultOpts, result.opts ? yaml.safeLoad(result.opts) : {});
                    return setIfFileExists(basePath+'.errors.yaml', result, 'errors');
                }).then(function() {
                    if(result.errors) { result.errors = yaml.safeLoad(result.opts); }
                }).then(function() {
                    return txtToSql.generateScripts(param);
                }).then(function(generated){
                    // console.log("R sql", result.sql.length, result.sql);
                    // console.log("G sql", generated.sql.length, generated.sql);
                    expect(generated.sql).to.eql(result.sql);
                    expect(differences(generated.sql,result.sql)).to.eql(null);
                    expect(generated.opts).to.eql(result.opts);
                    expect(generated.errors).to.eql(result.errors);
               }).then(done,done);
            });   
        }
    });
});

describe("exceptions", function(){
    it("should reject wrong separator", function(done){
        Promise.resolve().then(function(){
            var txt="text-field_int-field_num-field_big_double\n"+
                "hello_1\r3.141592_1234567890_1.12e-101\r\n"+
                "___0_0.0";
            return txtToSql.generateScripts({tableName:'unimportant', txt:txt});
        }).then(function(generated){
            expect(generated).to.eql({errors:['no separator detected']});
            done();
        });
    });
});