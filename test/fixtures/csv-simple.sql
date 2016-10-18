create table "csv-simple" (
 "rnum" integer,
 "username" character varying(9),
 "txt" character varying(16),
 "rn2" integer,
 "rol" character varying(4)
);

insert into "csv-simple" ("rnum", "username", "md5pass", "rn2", "rol") values
 (1, 'ejemplo 1', 'txt 1', 101, 'tes1'),
 (2, 'ejemplo 2', 'txt 2', 102, 'tes2'),
 (3, 'ejemplo 3', 'txt raro " con comilla', 103, 'tes3'),
 (4, 'ejemplo 4', 'dos " comillas "', 104, 'tes4');