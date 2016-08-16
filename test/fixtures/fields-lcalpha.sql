create table "fields_lcalpha" (
 "cone_e" text,
 "esdr_julo" integer,
 "nada_raro" numeric,
 "mixto" bigint,
 "_1n_meroyacento" double precision
);

insert into "fields_lcalpha" ("cone_e", "esdr_julo", "nada_raro", "mixto", "_1n_meroyacento") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 (null, null, null, 0, 0.0);