create table "csv-harder" (
 "rnum" integer,
 "txt" character varying(20),
 primary key ("rnum")
);

insert into "csv-harder" ("rnum", "txt") values
 (1, 'txt 1'),
 (2, 'incluye separator(;)'),
 (3, 'txt con " doble'),
 (4, 'txt con '' simple'),
 (5, 'incluye delimiter(")');