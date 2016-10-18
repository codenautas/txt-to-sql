# txt-to-sql
Tools for convert text data to SQL sentences


![designing](https://img.shields.io/badge/stability-designing-red.svg)
[![npm-version](https://img.shields.io/npm/v/txt-to-sql.svg)](https://npmjs.org/package/txt-to-sql)
[![downloads](https://img.shields.io/npm/dm/txt-to-sql.svg)](https://npmjs.org/package/txt-to-sql)
[![build](https://img.shields.io/travis/codenautas/txt-to-sql/master.svg)](https://travis-ci.org/codenautas/txt-to-sql)
[![coverage](https://img.shields.io/coveralls/codenautas/txt-to-sql/master.svg)](https://coveralls.io/r/codenautas/txt-to-sql)
[![climate](https://img.shields.io/codeclimate/github/codenautas/txt-to-sql.svg)](https://codeclimate.com/github/codenautas/txt-to-sql)
[![dependencies](https://img.shields.io/david/codenautas/txt-to-sql.svg)](https://david-dm.org/codenautas/txt-to-sql)
[![qa-control](http://codenautas.com/github/codenautas/txt-to-sql.svg)](http://codenautas.com/github/codenautas/txt-to-sql)



language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](LEEME.md)

# Install
```sh
$ npm install -g txt-to-sql
```


## Usage (command-line)



```sh
# Generate file.yaml with detected options
$ txt-to-sql --prepare file.txt

# Process file.txt
$ txt-to-sql file.txt

# Process file.txt using streams
$ txt-to-sql --fast file.txt

# Exportr defaults to working directory
$ txt-to-sql --export-default
```


## Usage (code)


```js
var txtToSql = require('txt-to-sql');
var fs = require('fs-promise');

txtToSql.generateScripts('./path/to/file.txt').then(function(generated){
    return fs.writeFile("file.sql", generated.rawSql);
}).then(function() {
    console.log("Done!");
});

```

## License

[MIT](LICENSE)

