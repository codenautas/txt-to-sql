"use strict";

var fs = require('fs-promise');
var txtToSql = require('../lib/txt-to-sql.js');
var expect = require('expect.js');
var selfExplain = require('self-explain');
var differences = selfExplain.assert.allDifferences;
var changing = require('best-globals').changing;
var yaml = require('js-yaml');

var _ = require('lodash');

function setIfFileExists(fileName, outObject, outProperty) {
    return fs.exists(fileName).then(function(exists) {
        if(exists) { return fs.readFile(fileName, {encoding:'utf8'}); }
        return { notExists: true };
    }).then(function(content) {
        if(! content.notExists) { outObject[outProperty] = content; }
    });
}

function loadYamlIfFileExists(fileName) {
    var res = {};
    return setIfFileExists(fileName, res, 'all').then(function() {
        return yaml.safeLoad(res.all || {});
    });
}

var defaultResult;
function loadDefaultResult() {
    if(defaultResult) { return Promise.resolve(defaultResult); }
    return loadYamlIfFileExists('./test/fixtures/_default_.result.yaml').then(function(yml) {
       defaultResult = yml;
    });
}

function makeSqlArray(sqls) {
    return sqls.split(/(\r?\n){2}/g)
               .filter(function(sqls){ return !sqls.match(/^(\r?\n)$/); });
}

describe("fixtures", function(){
    [
        {path:'example-one'},
        {path:'pk-simple', changeResult:function(res) { res.opts.separator = '\t'; }},
        {path:'pk-complex', changeResult:function(res) { res.opts.separator = '|'; }},
        {path:'pk-complex-all', changeResult:function(res) { res.opts.separator = '|'; }},
        {path:'pk-very-simple', changeResult:function(res) { res.opts.separator = ','; }},
        {path:'without-pk-2'},
        {path:'pk-simple-nn', changeResult:function(res) { res.opts.separator = '\t'; }},
        {path:'pk-complex-nn'},
        {path:'pk-complex-nn2'},
        {path:'pk-very-simple2', changeResult:function(res) { res.opts.separator = ','; }},
        {path:'pk-space-simple', changeResult:function(res) { res.opts.separator = /\s+/; }},
        {path:'exceptions', changeResult:function(res) { res.opts.separator=false; }},
        {path:'fields-unmod'},
        {path:'fields-lcnames'},
        {path:'fields-lcalpha'},
        {path:'fields-unmod-dups'},
        {path:'fields-lcnames-dups'},
        {path:'fields-lcalpha-dups'},
        {path:'wrong-input', changeResult:function(res) { res.opts.separator=false; } },
        {path:'wrong-input2',
         changeParam:function(param) { delete param.tableName; },
         changeResult:function(res) { res.opts.separator=false; }
        },
        {path:'wrong-input3', changeResult:function(res) { res.opts.separator=false; }},
        {path:'separator1', changeResult:function(res) { res.opts.separator = '/'; }},
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
                    if(fixture.changeParam) { fixture.changeParam(param); }
                }).then(function() {
                    return loadDefaultResult();
                }).then(function() {
                    // console.log("DR", defaultResult)
                    return loadYamlIfFileExists(basePath+'.result.yaml');
                }).then(function(yml) {
                    result = changing(_.cloneDeep(defaultResult), yml);
                    return setIfFileExists(basePath+'.sql', result, 'sqls');
                }).then(function() {
                    if(result.sqls) { result.sqls = makeSqlArray(result.sqls); }
                    if(fixture.changeResult) { fixture.changeResult(result); }
                    //console.log("RES", result)
                }).then(function() {
                    // console.log("PRM", param)
                    return txtToSql.prepare(param);
                }).then(function(preparedResult){
                    prepared = preparedResult;
                    return txtToSql.generateScripts(param);
                }).then(function(generated){
                    //console.log("P", param); console.log("R", result.opts); console.log("P", prepared);
                    expect(prepared.opts).to.eql(result.opts);
                    expect(prepared.errors).to.eql(result.errors);
                    //console.log("G", generated);
                    expect(generated.sqls).to.eql(result.sqls);
                    expect(differences(generated.sqls,result.sqls)).to.eql(null);
                    expect(generated.errors).to.eql(result.errors);
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
            return fs.readFile('./test/fixtures/example-one.sql', {encoding:'utf8'}).then(function(sqls){
                sqls = makeSqlArray(sqls);
                expect(generated.sqls).to.eql(sqls);
                expect(differences(generated.sqls,sqls)).to.eql(null);
                return;
            });
        }).then(done,done);
    });
});

