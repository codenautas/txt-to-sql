"use strict";

var fs = require('fs-promise');
var txtToSql = require('../lib/txt-to-sql.js');

var expect = require('expect.js');
var selfExplain = require('self-explain');
var differences = selfExplain.assert.allDifferences;

describe("fixtures", function(){
    [
        {path:'example-one'},
        {path:'pk-simple'},
        {path:'pk-complex'},
        {path:'pk-complex-all'},
        {path:'pk-very-simple'},
        {path:'without-pk-2'},
    ].forEach(function(fixture){
        if(fixture.skip) {
            it.skip("fixture: "+fixture.path);
        } else {
            it("fixture: "+fixture.path, function(done){
                var basePath='./test/fixtures/'+fixture.path;
                fs.readFile(basePath+'.txt', {encoding:'utf8'}).then(function(txt){
                    return txtToSql.generateScripts({tableName:fixture.path, txt:txt});
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