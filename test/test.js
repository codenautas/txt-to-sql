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
        {path:'pk-very-simple2', changeExpected:function(exp) { exp.opts.separator = ',';}},
        {path:'without-pk-2'},
        {path:'pk-simple-nn', changeExpected:function(exp) { exp.opts.separator = '\t'; }},
        {path:'pk-complex-nn'},
        {path:'pk-complex-nn2'},
        {path:'pk-space-simple', changeExpected:function(exp) { exp.opts.separator = /\s+/; } },
        {path:'fields-unmod'},
        {path:'fields-lcnames'},
        {path:'fields-lcalpha'},
        {path:'fields-unmod-dups', changeExpected:function(exp) { delete exp.columns; }},
        {path:'fields-lcnames-dups', changeExpected:function(exp) { delete exp.columns; }},
        {path:'fields-lcalpha-dups', changeExpected:function(exp) { delete exp.columns; }},
        {path:'separator', changeExpected:function(exp) { exp.opts.separator = '/'; }},
        {path:'pk-enabled'},
        {path:'pk-disabled'},
        {path:'comma-align'},
        {path:'comma-align-nulls'},
        {path:'comma-align-one-column'},
        {path:'one-column-no-sep', changeExpected:function(exp) { exp.opts.separator = false; delete exp.columns; }},
        {path:'comma-align-with-max'},
        {path:'example-one-mysql'},
        {path:'pk-complex-all-mysql'},
        {path:'adapt'},
        {path:'adapt-mysql'},
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
                    return loadDefaultExpectedResult();
                }).then(function() {
                    return loadYamlIfFileExists(basePath+'.result.yaml');
                }).then(function(yml) {
                    expected = changing(JSON.parse(JSON.stringify(defaultExpectedResult)), yml);
                    return setIfFileExists(basePath+'.sql', expected, 'sqls');
                }).then(function() {
                    expected.columns = [];
                    if(expected.sqls) {
                        expected.sqls = makeSqlArray(expected.sqls);
                        var parts = expected.sqls[0].split('(');
                        var columns = parts[1].split(',').map(function(column) {
                            return column.trim().replace(/(\n\);)$/,'');
                        });
                        var last = columns[columns.length-1];
                        var pks = [];
                        if(last===');') {
                            columns.splice(-1,1);
                        } else if(last==='primary key') {
                            columns.splice(-1,1); // remuevo quoting
                            pks = parts[2].split(')')[0].split(',').map(function(pk) { return pk.trim(); });
                        }
                        expected.columns = columns.map(function(column) {
                            var fyt = column.split(' ');
                            var name = fyt[0];
                            var type = fyt.slice(1).join(' ');
                            return {
                                name:name,
                                type:type,
                                inPrimaryKey: pks.indexOf(name) !== -1,
                                maxLength:0,
                                hasNullValues:false,
                                maxScale:type!=='text'?0:null,
                                hasCientificNotation:type==='double precision'?false:null
                            };
                        });
                    }
                    if(fixture.changeExpected) { fixture.changeExpected(expected); }
                    if(expected.columns) {
                        var lines=param.txt.split(/\r?\n/);
                        lines.shift(); // elimino headers
                        lines = lines.filter(function(line){ return line.trim()!==""; })
                                     .map(function(line) {
                            return line.split(expected.opts.separator).forEach(function(val, index) {
                               var col = expected.columns[index];
                               var lenInfo = txtToSql.getLengthInfo(val, col.type);
                               var len = lenInfo.length || lenInfo.precision;
                               if(col.maxLength<len) { col.maxLength = len; }
                               if(! col.hasNullValues && ! val) { col.hasNullValues=true; }
                               if(lenInfo.scale && col.maxScale && col.maxScale < lenInfo.scale) { col.maxScale=lenInfo.scale; }
                               if(col.hasCientificNotation===false && val.match(/[eE]/)) { col.hasCientificNotation=true; }
                           });
                        });
                    }
                    // console.log("expected.columns", expected.columns)
                }).then(function() {
                    return txtToSql.prepare(param);
                }).then(function(preparedResult){
                    prepared = preparedResult;
                    return txtToSql.generateScripts(param);
                }).then(function(generated){
                    // prepared
                    expect(prepared.opts).to.eql(expected.opts);
                    expect(prepared.columns).to.eql(expected.columns);
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
        eBadFieldFormat="inexistent field format 'inexistent_format'",
        eBadOutFormat="inexistent output format 'inexistent output format'";
    var optBadFieldFormat = {fieldFormat: 'inexistent_format'};
    var optBadOutFormat = {outputFormat: 'inexistent output format'};
    [
        { name:'no txt',
          param:{tableName:'t1'},
          errors:[eNoTXT]},
        { name:'no txt and tableName',
          param:{},
          errors:[eNoTable, eNoTXT]},
        { name:'no tableName and fieldFormat',
          param:{txt:'dummy', opts:optBadFieldFormat},
          errors:[eNoTable, eBadFieldFormat]},
        { name:'bad output format',
          param:{tableName:'t1', txt:'dummy', opts:optBadOutFormat},
          errors:[eBadOutFormat]},
        { name:'all bad params',
          param:{opts:optBadFieldFormat},
          errors:[eNoTable, eNoTXT, eBadFieldFormat]},
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

