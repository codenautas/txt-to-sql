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

function trimQuotes(txt) {
    return txt.trim().replace(/^(")/,'').replace(/(")$/,'');
}

var defaultExpectedResult;
function loadDefaultExpectedResult() {
    if(defaultExpectedResult) { return Promise.resolve(defaultExpectedResult); }
    return loadYamlIfFileExists('./test/fixtures/_default_.result.yaml').then(function(yml) {
       defaultExpectedResult = yml;
    });
}

function makeSqlArray(sqls) {
    return sqls.split(/(\r?\n){2}/g)
               .filter(function(sqls){ return !sqls.match(/^(\r?\n)$/); });
}

describe("fixtures", function(){
    [
        {path:'example-one'},
        {path:'pk-simple', changeExpected:function(exp) { exp.opts.separator = '\t'; }},
        {path:'pk-complex', changeExpected:function(exp) { exp.opts.separator = '|'; }},
        {path:'pk-complex-all', changeExpected:function(exp) { exp.opts.separator = '|';}},
        {path:'pk-very-simple', changeExpected:function(exp) { exp.opts.separator = ',';}},
        {path:'pk-very-simple2', changeExpected:function(exp) {
                exp.opts.separator = ',';
            }
        },
        {path:'without-pk-2'},
        {path:'pk-simple-nn', changeExpected:function(exp) { exp.opts.separator = '\t'; }},
        {path:'pk-complex-nn'},
        {path:'pk-complex-nn2'},
        {path:'pk-space-simple', changeExpected:function(exp) {
                exp.opts.separator = /\s+/;

            }
        },
        {path:'fields-unmod'},
        {path:'fields-lcnames'},
        {path:'fields-lcalpha'},
        {path:'fields-unmod-dups', changeExpected:function(exp) { delete exp.fields; }},
        {path:'fields-lcnames-dups', changeExpected:function(exp) { delete exp.fields; }},
        {path:'fields-lcalpha-dups', changeExpected:function(exp) { delete exp.fields; }},
        {path:'separator', changeExpected:function(exp) { exp.opts.separator = '/'; }},
        {path:'pk-enabled'},
        {path:'pk-disabled'},
        {path:'comma-align'},
        {path:'comma-align-nulls'},
        {path:'comma-align-one-column'},
        {path:'one-column-no-sep', changeExpected:function(exp) { exp.opts.separator = false; delete exp.fields; }},
        {path:'comma-align-with-max'},
    ].forEach(function(fixture){
        if(fixture.skip) {
            it.skip("fixture: "+fixture.path);
        } else {
            it("fixture: "+fixture.path, function(done){
                var param={tableName:fixture.path};
                var expected={};
                var basePath='./test/fixtures/'+fixture.path;
                var prepared;
                setIfFileExists(basePath+'.in-opts.yaml', param, 'opts').then(function() {
                    if(param.opts) { param.opts = yaml.safeLoad(param.opts); }
                    return setIfFileExists(basePath+'.txt', param, 'txt');
                }).then(function() {
                    // para poder cambiar despues de cargar
                    if(fixture.changeParam) { fixture.changeParam(param); }
                }).then(function() {
                    return loadDefaultExpectedResult();
                }).then(function() {
                    return loadYamlIfFileExists(basePath+'.result.yaml');
                }).then(function(yml) {
                    expected = changing(_.cloneDeep(defaultExpectedResult), yml);
                    return setIfFileExists(basePath+'.sql', expected, 'sqls');
                }).then(function() {
                    expected.fields = [];
                    if(expected.sqls) {
                        expected.sqls = makeSqlArray(expected.sqls);
                        var parts = expected.sqls[0].split('(');
                        var fields = parts[1].split(',').map(function(field) {
                            return field.trim().replace(/(\n\);)$/,'');
                        });
                        var last = fields[fields.length-1];
                        var pks = [];
                        if(last===');') {
                            fields.splice(-1,1);
                        } else if(last==='primary key') {
                            fields.splice(-1,1);
                            pks = parts[2].split(')')[0].split(',').map(function(pk) { return  trimQuotes(pk); });
                        }
                        expected.fields = fields.map(function(field) {
                            var fyt = field.split(' ');
                            //var name = trimQuotes(fyt[0]).replace(/""/g,'"');
                            var name = trimQuotes(fyt[0]);
                            return { name:name, type:fyt.slice(1).join(' ')};
                        });
                        //console.log("pks", pks, "fields", expected.fields)
                        expected.fields.forEach(function(field) {
                            //field.inPrimaryKey = pks.indexOf(field.name.replace(/"/g,'""')) !== -1;
                            field.inPrimaryKey = pks.indexOf(field.name) !== -1;
                        });
                    }
                    if(fixture.changeExpected) { fixture.changeExpected(expected); }
                    // console.log("expected.fields", expected.fields)
                }).then(function() {
                    return txtToSql.prepare(param);
                }).then(function(preparedResult){
                    prepared = preparedResult;
                    return txtToSql.generateScripts(param);
                }).then(function(generated){
                    // prepared
                    expect(prepared.opts).to.eql(expected.opts);
                    expect(prepared.fields).to.eql(expected.fields);
                    // generated
                    expect(generated.errors).to.eql(expected.errors);
                    expect(generated.sqls).to.eql(expected.sqls);
                    expect(differences(generated.sqls,expected.sqls)).to.eql(null);
                    // coherencia entre prepared y generated
                    expect(generated.errors).to.eql(prepared.errors);
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

describe("input errors", function(){
    var eNoTXT='no txt in input',
        eNoTable='undefined table name',
        eBadFormat="inexistent field format 'inexistent_format'";
    var optBadFormat = {fieldFormat: 'inexistent_format'};
    [
        { name:'no txt',
          param:{tableName:'t1'},
          errors:[eNoTXT]},
        { name:'no txt and tableName',
          param:{},
          errors:[eNoTable, eNoTXT]},
        { name:'no tableName and fieldFormat',
          param:{txt:'dummy', opts:optBadFormat},
          errors:[eNoTable, eBadFormat]},
        { name:'all bad params',
          param:{opts:optBadFormat},
          errors:[eNoTable, eNoTXT, eBadFormat]},
    ].forEach(function(check){
        if(check.skip) {
            it.skip(check.name);
        } else {
            it(check.name, function(done){
                txtToSql.prepare(check.param).then(function(prepared){
                    expect(prepared.errors).to.eql(check.errors);
                }).then(done,done);
            });
        }
    });
});

