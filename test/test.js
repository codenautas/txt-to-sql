"use strict";

var fs = require('fs-promise');
var txtToSql = require('../lib/txt-to-sql.js');

var expect = require('expect.js');
var selfExplain = require('self-explain');
var differences = selfExplain.assert.allDifferences;

var yaml = require('js-yaml');

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
        {path:'example-uppercase'},
    ].forEach(function(fixture){
        if(fixture.skip) {
            it.skip("fixture: "+fixture.path);
        } else {
            it("fixture: "+fixture.path, function(done){
                var param={tableName:fixture.path};
                var basePath='./test/fixtures/'+fixture.path;
                var optsPath=basePath+'.in-opts.yaml';
                fs.exists(optsPath).then(function(exists) {
                    if(exists) { return fs.readFile(optsPath, {encoding:'utf8'}); }
                    return { notExists: true};
                }).then(function(content) {
                    if(! content.notExists) {
                        param.opts = yaml.safeLoad(content);
                    }
                }).then(function() {
                    return fs.readFile(basePath+'.txt', {encoding:'utf8'});
                }).then(function(txt){
                    param.txt = txt;
                    //console.log("param", param);
                    return txtToSql.generateScripts(param);
                }).then(function(script){
                    return fs.readFile(basePath+'.sql', {encoding:'utf8'}).then(function(sql){
                        expect(script).to.eql(sql);
                        expect(differences(script,sql)).to.eql(null);
                        return;
                    });
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
        }).then(function(script){
            return fs.readFile('./test/fixtures/example-one.sql', {encoding:'utf8'}).then(function(sql){
                expect(script).to.eql(sql);
                expect(differences(script,sql)).to.eql(null);
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