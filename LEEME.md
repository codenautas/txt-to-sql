<!--multilang v0 es:LEEME.md en:README.md -->
# txt-to-sql
<!--lang:es-->
Herramientas para convertir datos que residen en archivos de texto 
en sentencias SQL listas para usarlas en la base de datos

<!--lang:en--]
Tools for convert text data to SQL sentences

[!--lang:*-->

<!-- cucardas -->
![designing](https://img.shields.io/badge/stability-designing-red.svg)
[![npm-version](https://img.shields.io/npm/v/txt-to-sql.svg)](https://npmjs.org/package/txt-to-sql)
[![downloads](https://img.shields.io/npm/dm/txt-to-sql.svg)](https://npmjs.org/package/txt-to-sql)
[![build](https://img.shields.io/travis/codenautas/txt-to-sql/master.svg)](https://travis-ci.org/codenautas/txt-to-sql)
[![coverage](https://img.shields.io/coveralls/codenautas/txt-to-sql/master.svg)](https://coveralls.io/r/codenautas/txt-to-sql)
[![climate](https://img.shields.io/codeclimate/github/codenautas/txt-to-sql.svg)](https://codeclimate.com/github/codenautas/txt-to-sql)
[![dependencies](https://img.shields.io/david/codenautas/txt-to-sql.svg)](https://david-dm.org/codenautas/txt-to-sql)
[![qa-control](http://codenautas.com/github/codenautas/txt-to-sql.svg)](http://codenautas.com/github/codenautas/txt-to-sql)


<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](README.md)

<!--lang:es-->
# Instalación
<!--lang:en--]
# Install
[!--lang:*-->
```sh
$ npm install -g txt-to-sql
```

<!--lang:es-->

## Uso (línea de comandos)

<!--lang:en--]

## Usage (command-line)

[!--lang:*-->

<!--lang:es-->

```sh
# Generar file.yaml lo detectado
$ txt-to-sql --prepare file.txt

# Procesar file.txt
$ txt-to-sql file.txt

# Procesar file.txt con streams
$ txt-to-sql --fast file.txt

# Exportar defaults a la carpeta actual
$ txt-to-sql --export-default
```

<!--lang:en--]

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

[!--lang:es-->

## Uso (código)

<!--lang:en--]

## Usage (code)

[!--lang:*-->

```js
var txtToSql = require('txt-to-sql');
var fs = require('fs-promise');

txtToSql.generateScripts('./path/to/file.txt').then(function(generated){
    return fs.writeFile("file.sql", generated.rawSql);
}).then(function() {
    console.log("Done!");
});

```

<!--lang:es-->
## Licencia
<!--lang:en--]
## License
[!--lang:*-->

[MIT](LICENSE)

