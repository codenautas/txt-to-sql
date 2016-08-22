create table "fields_lcalpha" (
 "cone_e" text,
 "esdrujulo" integer,
 "nada_raro" numeric,
 "mixto" bigint,
 "_1numeroyacento" double precision
);

insert into "fields_lcalpha" ("cone_e", "esdrujulo", "nada_raro", "mixto", "_1numeroyacento") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 (null, null, null, 0, 0.0);