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

function TestStream () {
  stream.Writable.call(this);
  this.data = [];
};
util.inherits(TestStream, stream.Writable);

TestStream.prototype._write = function (chunk, encoding, done) {
  this.data.push(chunk.toString());
  //console.log(chunk.toString());
  done();
}

TestStream.prototype.getData = function() {
   return this.data; 
};

var fastBufferingThreshold = 4;

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

describe("fast-fixtures", function(){
    [
        {path:'example-one', skip:true},
        // {path:'pk-simple', changeExpected:function(exp) { exp.opts.separator = '\t'; }},
        // {path:'pk-complex', changeExpected:function(exp) { exp.opts.separator = '|'; }},
        // {path:'pk-complex-all', changeExpected:function(exp) { exp.opts.separator = '|';}},
        // {path:'pk-very-simple', changeExpected:function(exp) { exp.opts.separator = ',';}},
        // {path:'pk-very-simple2', changeExpected:function(exp) { exp.opts.separator = ',';}},
        // {path:'pk-simple-nn', changeExpected:function(exp) { exp.opts.separator = '\t'; }},
        // {path:'pk-complex-nn'},
        // {path:'pk-complex-nn2'},
        // {path:'pk-space-simple', changeExpected:function(exp) { exp.opts.separator = /\s+/; } },
        // {path:'pk-enabled'},
        // {path:'pk-disabled'},
        // {path:'without-pk-2'},
        // {path:'fields-unmod'},
        // {path:'fields-lcnames'},
        // {path:'fields-lcalpha'},
        // {path:'separator', changeExpected:function(exp) { exp.opts.separator = '/'; }},
        // {path:'comma-align'},
        // {path:'comma-align-nulls'},
        // {path:'comma-align-one-column'},
        // {path:'comma-align-with-max'},
        // {path:'adapt'},
        // {path:'column-names'},
        // {path:'columns-with-spaces'},
        // {path:'mysql-example-one'},
        // {path:'mysql-pk-complex-all'},
        // {path:'mysql-adapt'},
        // {path:'sqlite-example-one'},
        // {path:'sqlite-pk-complex-all'},
        // {path:'sqlite-adapt'},
        // {path:'mssql-example-one'},
        // {path:'oracle-example-one'},
        // {path:'with-drop-table'},
        // {path:'mysql-with-drop-table'},
        // {path:'sqlite-with-drop-table'},
        // {path:'fields-ansi-lcalpha'}, // ansi
        // {path:'mssql-comma-align'},
        // {path:'mssql-with-drop-table'},
        // {path:'oracle-with-drop-table'},
        // {path:'pk-explicit'},
        // {path:'pk-custom'},
        // {path:'pk-custom-names'},
        // {path:'with-null-lines'},
        // {path:'csv-simple'},
        // {path:'csv-harder'},
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
                //var generated = new stream.Writable();
                var generated = new TestStream();
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
                    return txtToSqlFast.doFast(param, basePath, fastBufferingThreshold, generated);
                }).then(function(){
                    //process.stdout.pipe(generated)
                    //console.log("generated", generated.getData());
                    /*
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
                    */
               }).then(done,done);
            });   
        }
    });
});
