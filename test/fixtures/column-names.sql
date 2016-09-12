create table "column-names" (
 "mi-text" character varying(5),
 "mi-int" integer(1),
 "mi-num" numeric(8,6),
 "mi-big" bigint(10),
 "mi-double" double precision(9,7)
);

insert into "column-names" ("mi-text", "mi-int", "mi-num", "mi-big", "mi-double") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 (null, null, null, 0, 0.0);