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
        {path:'specials'},
        {path:'exceptions'},
        {path:'fields-unmod'},
        {path:'fields-lcnames'},
        {path:'fields-lcalpha'},
        {path:'fields-unmod-dups'},
        {path:'fields-lcnames-dups'},
        {path:'fields-lcalpha-dups'},
        {path:'wrong-input'},
        {path:'wrong-input2', change:function(param) { delete param.tableName; } },
        {path:'wrong-input3'},
        {path:'separator1'},
    ].forEach(function(fixture){
        if(fixture.skip) {
            it.skip("fixture: "+fixture.path);
        } else {
            it("fixture: "+fixture.path, function(done){
                var param={tableName:fixture.path};
                var result={};
                var basePath='./test/fixtures/'+fixture.path;
                var prepared;
                setIfFileExists(basePath+'.in-opts.yaml', param, 'opts').then(function() {
                    if(param.opts) { param.opts = yaml.safeLoad(param.opts); }
                    return setIfFileExists(basePath+'.txt', param, 'txt');
                }).then(function() {
                    // para poder cambiar despues de cargar
                    if(fixture.change) { fixture.change(param); }
                }).then(function() {
                    return setIfFileExists(basePath+'.sql', result, 'sql');
                }).then(function() {
                    if(result.sql) {
                        result.sql = result.sql.split(/(\r?\n){2}/g)
                                               .filter(function(sql){ return !sql.match(/^(\r?\n)$/); });
                    }
                    return setIfFileExists(basePath+'.out-opts.yaml', result, 'opts');
                }).then(function() {
                    // si no se define result.opts, asumimos que es igual a param.opts
                    result.opts = changing(txtToSql.defaultOpts, result.opts ? yaml.safeLoad(result.opts) : (param.opts || {}) );
                    return setIfFileExists(basePath+'.errors.yaml', result, 'errors');
                }).then(function() {
                    if(result.errors) { result.errors = yaml.safeLoad(result.errors); }
                }).then(function() {
                    return txtToSql.prepare(param);
                }).then(function(preparedResult){
                    prepared = preparedResult;
                    return txtToSql.generateScripts(param);
                }).then(function(generated){
                    // console.log("P", param.opts); console.log("R", result.opts);
                    //console.log("P", prepared);
                    expect(prepared.opts).to.eql(result.opts);
                    expect(prepared.errors).to.eql(result.errors);
                    expect(prepared.sql).not.be.ok();
                    //console.log("G", generated);
                    expect(generated.sql).to.eql(result.sql);
                    expect(differences(generated.sql,result.sql)).to.eql(null);
                    expect(generated.errors).to.eql(result.errors);
               }).then(done,done);
            });   
        }
    });
});
