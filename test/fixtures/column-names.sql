create table "column-names" (
 "mi-text" character varying(5),
 "mi-int" integer,
 "mi-num" numeric(8,6),
 "mi-big" bigint,
 "mi-double" double precision
);

insert into "column-names" ("mi-text", "mi-int", "mi-num", "mi-big", "mi-double") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 ('hella', 4, 3.141594, 1234567890, 1.12e-101),
 (null, null, null, 0, 0.0);