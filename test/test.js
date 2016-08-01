"use strict";

var fs = require('fs-promise');
var txtToSql = require('../lib/txt-to-sql.js');

var expect = require('expect.js');
var selfExplain = require('self-explain');
var differences = selfExplain.assert.allDifferences;

describe("fixtures", function(){
    [
        {path:'example-one'},
        {path:'pk-simple', skip:true},
        {path:'pk-complex', skip:true},
    ].forEach(function(fixture){
        if(fixture.skip) {
            console.log("skipped:", fixture.path)
            return false;
        }
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
    });
});