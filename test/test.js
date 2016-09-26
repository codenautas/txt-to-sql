"use strict";

var fs = require('fs-promise');
var txtToSql = require('../lib/txt-to-sql.js');
var expect = require('expect.js');
var selfExplain = require('self-explain');
var differences = selfExplain.assert.allDifferences;
var changing = require('best-globals').changing;
var yaml = require('js-yaml');

function setIfFileExists(fileName, outObject, outProperty, options) {
    return fs.exists(fileName).then(function(exists) {
        if(exists) { return fs.readFile(fileName, (options || {encoding:'utf8'})); }
        return { notExists: true };
    }).then(function(content) {
        if(! content.notExists) {
            outObject[outProperty] = content;
        }
    });
}

function loadYamlIfFileExists(fileName) {
    var res = {};
    return setIfFileExists(fileName, res, 'all').then(function() {
        return yaml.safeLoad(res.all || {});
    });
}

function loadYaml(fileName) {
    var res = {};
    return setIfFileExists(fileName, res, 'all').then(function() {
        if(!res.all) {
            throw new Error('"'+fileName+'" debe existir');
        }
        return yaml.safeLoad(res.all);
    });
}


var defaultExpectedResult;
function loadDefaultExpectedResult() {
    if(defaultExpectedResult) { return Promise.resolve(defaultExpectedResult); }
    return loadYamlIfFileExists('./test/fixtures/_default_.result.yaml').then(function(yml) {
       defaultExpectedResult = yml;
    });
}

function makeSqlArray(sqlsBuf) {
    var iNL=0;
    var sqlsArr=[];
    while((iNL=sqlsBuf.indexOf(10,iNL))>=0){
        if(sqlsBuf[iNL+1]===10 || sqlsBuf[iNL+1]===13 && sqlsBuf[iNL+2]===10){
            sqlsArr.push(sqlsBuf.slice(0,iNL-(sqlsBuf[iNL-1]===13?1:0)));
            sqlsBuf = sqlsBuf.slice(iNL+(sqlsBuf[iNL+1]===13?3:2));
            iNL=0;
        }else{
            iNL++;
        }
    }
    sqlsArr.push(sqlsBuf);
    return sqlsArr;
}

describe("fixtures", function(){
    [
        {path:'example-one'},
        {path:'pk-simple', changeExpected:function(exp) { exp.opts.separator = '\t'; }},
        {path:'pk-complex', changeExpected:function(exp) { exp.opts.separator = '|'; }},
        {path:'pk-complex-all', changeExpected:function(exp) { exp.opts.separator = '|';}},
        {path:'pk-very-simple', changeExpected:function(exp) { exp.opts.separator = ',';}},
        {path:'pk-very-simple2', changeExpected:function(exp) { exp.opts.separator = ',';}},
        {path:'pk-simple-nn', changeExpected:function(exp) { exp.opts.separator = '\t'; }},
        {path:'pk-complex-nn'},
        {path:'pk-complex-nn2'},
        {path:'pk-space-simple', changeExpected:function(exp) { exp.opts.separator = /\s+/; } },
        {path:'pk-enabled'},
        {path:'pk-disabled'},
        {path:'without-pk-2'},
        {path:'fields-unmod'},
        {path:'fields-lcnames'},
        {path:'fields-lcalpha'},
        {path:'fields-unmod-dups', changeExpected:function(exp) { delete exp.columns; }},
        {path:'fields-lcnames-dups', changeExpected:function(exp) { delete exp.columns; }},
        {path:'separator', changeExpected:function(exp) { exp.opts.separator = '/'; }},
        {path:'comma-align'},
        {path:'comma-align-nulls'},
        {path:'comma-align-one-column'},
        {path:'comma-align-with-max'},
        {path:'one-column-no-sep', changeExpected:function(exp) { exp.opts.separator = false; delete exp.columns; }},
        {path:'adapt'},
        {path:'column-names'},
        {path:'columns-with-spaces'},
        {path:'mysql-example-one'},
        {path:'mysql-pk-complex-all'},
        {path:'mysql-adapt'},
        {path:'sqlite-example-one'},
        {path:'sqlite-pk-complex-all'},
        {path:'sqlite-adapt'},
        {path:'mssql-example-one'},
        {path:'oracle-example-one'},
        {path:'invalid-utf8'},
        {path:'invalid-ansi', skip:true},
        {path:'with-drop-table'},
        {path:'mysql-with-drop-table'},
        {path:'sqlite-with-drop-table'},
        {path:'fields-ansi-lcalpha'}, // ansi
        {path:'mssql-comma-align'},
        {path:'mssql-with-drop-table'},
        {path:'oracle-with-drop-table'},
    ].forEach(function(fixture){
        if(fixture.skip) {
            it.skip("fixture: "+fixture.path);
        } else {
            it("fixture: "+fixture.path, function(done){
                var defaultOpts = {inputEncoding:'UTF8', outputEncoding:'UTF8'};
                var param={tableName:fixture.path};
                var expected={};
                var basePath='./test/fixtures/'+fixture.path;
                var prepared;
                setIfFileExists(basePath+'.in-opts.yaml', param, 'opts').then(function() {
                    if(param.opts) {
                        param.opts = changing(defaultOpts, yaml.safeLoad(param.opts));
                    } else {
                        param.opts = defaultOpts;
                    }
                    return setIfFileExists(basePath+'.txt', param, 'rawTable', {});
                }).then(function() {
                    return loadDefaultExpectedResult();
                }).then(function() {
                    return loadYamlIfFileExists(basePath+'.result.yaml');
                }).then(function(yml) {
                    expected = changing(JSON.parse(JSON.stringify(defaultExpectedResult)), yml);
                    if(param.opts.outputEncoding !== null && param.opts.outputEncoding !== 'UTF8') {
                        console.log("OE", param.opts.outputEncoding)
                        throw new Error('Unhandled output test! Re-think next setIfFileExists() line!!');
                    }
                    return setIfFileExists(basePath+'.sql', expected, 'rawSql', {});
                }).then(function() {
                    if(fixture.changeExpected) { fixture.changeExpected(expected); }
                }).then(function() {
                    return txtToSql.prepare(param);
                }).then(function(preparedResult){
                    prepared = preparedResult;
                    return txtToSql.generateScripts(param);
                }).then(function(generated){
                    expect(prepared.opts).to.eql(expected.opts);
                    if(expected.columns) { expect(prepared.columns).to.eql(expected.columns); }
                    // generated
                    expect(generated.errors).to.eql(expected.errors);
                    expect(generated.rawSql).to.eql(expected.rawSql);
                    expect(differences(generated.rawSql,expected.rawSql)).to.eql(null);
                    // coherencia entre prepared y generated
                    expect(generated.errors).to.eql(prepared.errors);
               }).then(done,done);
            });   
        }
    });
});

describe("specials", function(){
    it("manage mixed line ends", function(done){
        var rawTable=new Buffer(
            "text-field;int-field;num-field;big;double\n"+
            "hello;1;3.141592;1234567890;1.12e-101\r\n"+
            ";;;0;0.0", 'binary'
        );
        Promise.resolve().then(function(){
            return txtToSql.generateScripts({tableName:'example-one', rawTable:rawTable});
        }).then(function(generated){
            return fs.readFile('./test/fixtures/example-one.sql').then(function(rawSql){
                expect(generated.rawSql).to.eql(rawSql);
                expect(differences(generated.rawSql,rawSql)).to.eql(null);
                return;
            });
        }).then(done,done);
    });
});

describe("input errors", function(){
    var dummyBuffer = new Buffer('dummy', 'binary');
    [
        { name:'no-rawtable'},
        { name:'no-table-and-rawtable'},
        { name:'no-table-bad-column-format', change:function(param) { param.rawTable = dummyBuffer; }},
        { name:'unsupported engine', change:function(param) { param.rawTable = dummyBuffer; }},
        { name:'all-bad-params'},
        { name:'wrong-number-of-column-names'},
        { name:'duplicated-column-names'},
        { name:'unsupported-encodings', change:function(param) { param.rawTable = dummyBuffer; }},
        { name:'bad-rawtable', change:function(param) { param.rawTable = 'not a Buffer'; }},
        { name:'fields-lcalpha-dups'},
    ].forEach(function(check){
        if(check.skip) {
            it.skip(check.name);
        } else {
            it("error: "+check.name, function(done){
                var basePath='./test/errors/'+check.name;
                var loaded={};
                var param={};
                var expected={};
                setIfFileExists(basePath+'.param.yaml', loaded, 'param').then(function() {
                    if(loaded.param) { param = yaml.safeLoad(loaded.param); }
                    if(! param.opts) { param.opts={}; }
                    return setIfFileExists(basePath+'.txt', param, 'rawTable', {});
                }).then(function() {
                    if(check.change) { check.change(param); }
                    return loadYaml(basePath+'.errors.yaml');
                }).then(function(yaml) {
                    expected = yaml;
                }).then(function() {
                    //console.log(check.name, param);
                    return txtToSql.prepare(param);
                }).then(function(prepared){
                    //console.log(check.name, prepared.errors, expected.errors)
                    expect(prepared.errors).to.eql(expected.errors);
                }).then(done,done);
            });
        }
    });
});

describe("file encoding", function(){
    [
        { name:'ascii7', file:'ascii7.txt', type:'ASCII7' },
        { name:'utf8', file:'utf8.txt', type:'UTF8'},
        { name:'utf8-bom', file:'utf8-bom.txt', type:'UTF8' },
        { name:'ansi', file:'ansi.txt', type:'ANSI' }
    ].forEach(function(check){
        if(check.skip) {
            it.skip(check.name);
        } else {
            it(check.name, function(done){
                fs.readFile('./test/encoding/'+check.file).then(function(buffer){
                    return txtToSql.getEncoding(buffer);
                }).then(function(encoding) {
                    expect(encoding).to.eql(check.type);
                }).then(done,done);
            });
        }
    });
});

