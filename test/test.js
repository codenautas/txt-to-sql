"use strict";

var fs = require('fs-promise');
var txtToSql = require('../lib/txt-to-sql.js');
var expect = require('expect.js');
var selfExplain = require('self-explain');
var differences = selfExplain.assert.allDifferences;
var changing = require('best-globals').changing;
var yaml = require('js-yaml');
var common = require('./test-common');

function loadYaml(fileName) {
    var res = {};
    return common.setIfFileExists(fileName, res, 'all').then(function() {
        if(!res.all) {
            throw new Error('"'+fileName+'" debe existir');
        }
        return yaml.safeLoad(res.all);
    });
}

describe("fixtures", function(){
    [
        {name:'example-one'},
        {name:'pk-simple', changeExpected:function(exp) { exp.opts.separator = '\t'; }},
        {name:'pk-complex', changeExpected:function(exp) { exp.opts.separator = '|'; }},
        {name:'pk-complex-all', changeExpected:function(exp) { exp.opts.separator = '|';}},
        {name:'pk-very-simple', changeExpected:function(exp) { exp.opts.separator = ',';}},
        {name:'pk-very-simple2', changeExpected:function(exp) { exp.opts.separator = ',';}},
        {name:'pk-simple-nn', changeExpected:function(exp) { exp.opts.separator = '\t'; }},
        {name:'pk-complex-nn'},
        {name:'pk-complex-nn2'},
        {name:'pk-space-simple', changeExpected:function(exp) { exp.opts.separator = /\s+/; } },
        {name:'pk-enabled'},
        {name:'pk-disabled'},
        {name:'without-pk-2'},
        {name:'fields-unmod'},
        {name:'fields-lcnames'},
        {name:'fields-lcalpha'},
        {name:'separator', changeExpected:function(exp) { exp.opts.separator = '/'; }},
        {name:'comma-align'},
        {name:'comma-align-nulls'},
        {name:'comma-align-one-column'},
        {name:'comma-align-with-max'},
        {name:'adapt'},
        {name:'column-names'},
        {name:'columns-with-spaces'},
        {name:'mysql-example-one'},
        {name:'mysql-pk-complex-all'},
        {name:'mysql-adapt'},
        {name:'sqlite-example-one'},
        {name:'sqlite-pk-complex-all'},
        {name:'sqlite-adapt'},
        {name:'mssql-example-one'},
        {name:'oracle-example-one'},
        {name:'with-drop-table'},
        {name:'mysql-with-drop-table'},
        {name:'sqlite-with-drop-table'},
        {name:'fields-ansi-lcalpha'}, // ansi
        {name:'mssql-comma-align'},
        {name:'mssql-with-drop-table'},
        {name:'oracle-with-drop-table'},
        {name:'pk-explicit'},
        {name:'pk-custom'},
        {name:'pk-custom-names'},
        {name:'with-null-lines'},
        {name:'csv-simple'},
        {name:'csv-harder'},
        {name:'insert-limit'},
        {name:'mssql-insert-limit'}, // compactInsertLimit should be ignored (#24)
        {name:'insert-limit2'},
        {name:'dates'},
        {name:'timestamps'},
        {skip:true, name:'booleans'},
    ].forEach(function(fixture){
        if(fixture.skip) {
            it.skip("fixture: "+fixture.name);
        } else {
            it("fixture: "+fixture.name, function(done){
                var defaultOpts = {inputEncoding:'UTF8', outputEncoding:'UTF8'};
                var param={tableName:fixture.name};
                var expected={};
                var basePath='./test/fixtures/'+fixture.name;
                var prepared;
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
                        throw new Error('Unhandled output test! Re-think next common.setIfFileExists() line!!');
                    }
                    return common.setIfFileExists(basePath+'.sql', expected, 'rawSql', {});
                }).then(function() {
                    if(fixture.changeExpected) { fixture.changeExpected(expected); }
                }).then(function() {
                    return txtToSql.prepare(param);
                }).then(function(preparedResult){
                    prepared = preparedResult;
                    return txtToSql.generateScripts(param);
                }).then(function(generated){
                    expect(prepared.opts).to.eql(expected.opts);
                    if(expected.columns) {
                        //console.log("PC", prepared.columns);
                        //console.log("EC", expected.columns);
                        expect(prepared.columns).to.eql(expected.columns);
                    }
                    // generated
                    expect(generated.errors).to.eql(expected.errors);
                    var comp = txtToSql.compareBuffers(generated.rawSql, expected.rawSql);
                    if(comp !==-1) {
                        console.log("GEN", generated.rawSql.toString());
                        console.log("EXP", expected.rawSql.toString());
                        console.log("diff in ", comp, "\n"+expected.rawSql.toString().substring(comp))
                    }
                    expect(generated.rawSql).to.eql(expected.rawSql);
                    expect(differences(generated.rawSql,expected.rawSql)).to.eql(null);
                    // coherencia entre prepared y generated
                    expect(generated.errors).to.eql(prepared.errors);
                    if(expected.stats) {
                        var stats = changing({},generated.stats);
                        delete stats.startTime;
                        delete stats.endTime;
                        expect(stats).to.eql(expected.stats);
                        expect(generated.stats.startTime).to.be.a('number');
                        expect(generated.stats.endTime).to.be.a('number');
                        //expect(generated.stats.endTime).to.be.greaterThan(generated.stats.startTime);
                    }
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
        { name:'fields-lcnames-dups'},
        { name:'fields-unmod-dups'},
        { name:'one-column-no-sep'},
        { name:'invalid-utf8'},
        { name:'invalid-ansi', skip:true},
        { name:'row-diff-num-columns'},
        { name:'missing-col-names'},
        { name:'include-pk-without-pk-columns'},
        { name:'req-columns-no-pk'},
        { name:'include-pk-columns-no-pk'},
    ].forEach(function(check){
        if(check.skip) {
            it.skip("error: "+check.name);
        } else {
            it("error: "+check.name, function(done){
                var basePath='./test/errors/'+check.name;
                var loaded={};
                var param={};
                var expected={};
                common.setIfFileExists(basePath+'.param.yaml', loaded, 'param').then(function() {
                    if(loaded.param) { param = yaml.safeLoad(loaded.param); }
                    if(! param.opts) { param.opts={}; }
                    return common.setIfFileExists(basePath+'.txt', param, 'rawTable', {});
                }).then(function() {
                    if(check.change) { check.change(param); }
                    return loadYaml(basePath+'.result.yaml');
                }).then(function(yaml) {
                    expected = yaml;
                }).then(function() {
                    //console.log(check.name, "param", param);
                    return txtToSql.prepare(param);
                }).then(function(prepared){
                    //console.log("prepared", prepared); console.log("expected", expected);
                    //console.log(check.name, "prep", prepared.errors, "expe", expected.errors)
                    expect(prepared.errors).to.eql(expected.errors);
                    expect(prepared.warnings).to.eql(expected.warnings);
                    if(prepared.errorStack) {
                        //console.log("prepared.errorStack", prepared.errorStack)
                        expect(prepared.errorStack).to.match(/txt-to-sql.js/);
                    }
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

function addStringizeTests(fixtures, lang) {
   fixtures.forEach(function(check, index) {
        var name=lang+' '+(index+1)+': '+JSON.stringify(check.stats).substr(0,40)+'...';
        if(check.skip) {
            it.skip(name);
        } else {
            it(name, function(){
                //console.log("'"+txtToSql.stringizeStats(check.stats,lang)+"'"); console.log("'"+check.out+"'")
                expect(txtToSql.stringizeStats(check.stats,lang)).to.eql(check.out);
            });
        }
    });
}

describe("stringizeStats", function(){
    // Tiempo de generación NNs. Registros NN, columnas NN (textos NN, nulos NN), clave primaria: TTT, TTTT.
    var fixtures_en=[
        {stats:{rows:3,columns:3,textColumns:1, nullColumns:2, primaryKey:[], startTime:0, endTime:1000},
           out:'Elapsed time 1s. Rows 3, columns 3 (texts:1, nulls:2)' },
        {stats:{rows:0,columns:1,textColumns:0, nullColumns:1, primaryKey:[], startTime:1000, endTime:8010},
           out:'Elapsed time 7s, 10ms. Rows 0, columns 1 (texts:0, nulls:1)' },
        {stats:{rows:20,columns:12,textColumns:7, nullColumns:5, primaryKey:['c1','c2'], startTime:0, endTime:1000*60*60},
           out:'Elapsed time 1h. Rows 20, columns 12 (texts:7, nulls:5), primary key: c1, c2'},
        {stats:{rows:2,columns:1,textColumns:0, nullColumns:1, primaryKey:['c1'], startTime:0, endTime:1000*60*60+60001},
           out:'Elapsed time 1h, 1m, 1ms. Rows 2, columns 1 (texts:0, nulls:1), primary key: c1'},
        {stats:{rows:1,columns:2,textColumns:1, nullColumns:0, primaryKey:[], startTime:0, endTime:0},
           out:'Elapsed time 0ms. Rows 1, columns 2 (texts:1, nulls:0)' },
    ];
    var fixtures_es=[];
    fixtures_en.forEach(function(fixture) {
        var fix = JSON.parse(JSON.stringify(fixture));
        Object.keys(txtToSql.dictionary['en']).forEach(function(word) {
            var search = txtToSql.dictionary['en'][word];
            var rep = txtToSql.dictionary['es'][word];
            if(word==='rows' || word==='time') {
                search = txtToSql.capitalize(search);
                rep = txtToSql.capitalize(rep);
            }
            fix.out = fix.out.replace(search, rep);
        });
        fixtures_es.push(fix);
    });
    addStringizeTests(fixtures_en, 'en');
    addStringizeTests(fixtures_es, 'es');
    addStringizeTests(fixtures_es, null);
});

describe("datatype validation", function(){
    it("integer", function(){
        var i = txtToSql.typeValidations['integer'].checkOne;
        // good
        expect(i('1')).to.be.ok();
        expect(i('1323')).to.be.ok();
        expect(i('12345')).to.be.ok();
        expect(i('0')).to.be.ok();
        expect(i('-1')).to.be.ok();
        // bad
        expect(i('123456')).to.not.be.ok();
        expect(i('1.1')).to.not.be.ok();
        expect(i('.1')).to.not.be.ok();
        expect(i('0.1')).to.not.be.ok();
        expect(i('texto')).to.not.be.ok();
    });
    it("bigint", function(){
        var bi = txtToSql.typeValidations['bigint'].checkOne;
        // good
        expect(bi('123456')).to.be.ok();
        expect(bi('123456789')).to.be.ok();
        expect(bi('-123456789')).to.be.ok();
        // bad
        expect(bi('0.1')).to.not.be.ok();
        expect(bi('1.5')).to.not.be.ok();
        expect(bi('string')).to.not.be.ok();
    });
    it("numeric", function(){
        var n = txtToSql.typeValidations['numeric'].checkOne;
        // good
        expect(n('123456.1')).to.be.ok();
        expect(n('123456789.5')).to.be.ok();
        expect(n('-123456789.666666')).to.be.ok();
        // bad
        expect(n('1.12e-101')).to.not.be.ok();
        expect(n('2.12e-101333')).to.not.be.ok();
        expect(n('palabra')).to.not.be.ok();
    });
    it("double precision", function(){
        var dp = txtToSql.typeValidations['double precision'].checkOne;
        // good
        expect(dp('123456.1')).to.be.ok();
        expect(dp('123456789.5')).to.be.ok();
        expect(dp('-123456789.666666')).to.be.ok();
        expect(dp('1.12e-101')).to.be.ok();
        expect(dp('2.12e-101333')).to.be.ok();
        // bad
        expect(dp('a1.12e-101')).to.not.be.ok();
    });
    it("timestamp", function(){
        var ts = txtToSql.typeValidations['timestamp'].checkOne;
        var tsA = txtToSql.typeValidations['timestamp'].checkArray;
        expect(tsA(0, [['2010-01-21 00:10:00.009']])).to.be.ok(); // coverage
        // good
        expect(ts('2016-11-21 10:00:01')).to.be.ok();
        expect(ts('2009-05-06 00:10:00 +4:00')).to.be.ok();
        expect(ts('2009-05-06 00:00:00 -12:00')).to.be.ok();
        expect(ts('2009-05-06 00:00:00 +13:00')).to.be.ok();
        // bad
        expect(ts('2016-11-21 0:00:01')).to.not.be.ok();
        expect(ts('2016-11-21 30:00:01')).to.not.be.ok();
        expect(ts('2016-21-21 30:00:01')).to.not.be.ok();
        expect(ts('2016-11-32 30:00:01')).to.not.be.ok();
        expect(ts('216-11-32 30:00:01')).to.not.be.ok();
        expect(ts('2009-05-06 00:10:00.100 /4:00')).to.not.be.ok();
        expect(ts('2009-05-06 00:10:00.100 4:00')).to.not.be.ok();
        expect(ts('2009-05-06 00:00:00 +13:60')).to.not.be.ok();
        expect(ts('not a timestamp')).to.not.be.ok();
    });
    it("date", function(){
        var d = txtToSql.typeValidations['date'].checkOne;
        // good
        expect(d('2016-11-21')).to.be.ok();
        expect(d('2016/11/21')).to.be.ok();
        expect(d('1/29/1969')).to.be.ok();
        expect(d('29/1/1969')).to.be.ok();
        expect(d('31/3/1969')).to.be.ok();
        expect(d('31/03/1969')).to.be.ok();
        expect(d('30/3/969')).to.be.ok();
        // bad
        expect(d('12016/11/21')).to.not.be.ok();
        expect(d('2016/11-21')).to.not.be.ok();
        expect(d('3-29/1969')).to.not.be.ok();
        expect(d('29/3-1969')).to.not.be.ok();
        expect(d('32/3/1969')).to.not.be.ok();
        expect(d('30/3/0969')).to.not.be.ok();
        expect(d('not a date')).to.not.be.ok();
    });
    it("boolean", function(){
        var b1 = txtToSql.typeValidations['boolean'].checkOne;
        var b = txtToSql.typeValidations['boolean'].checkArray;
        expect(b1('null')).to.be.ok(); // coverage
        // good
        expect(b(0, [['1'],['1'],['0'],['1']])).to.be.ok();
        expect(b(0, [['1'],['0'],[null],['0'],['1']])).to.be.ok();
        // bad
        expect(b(0, [['3'],['1'],['0'],['1']])).to.not.be.ok();
    });
});
