create table "all-types" (
 "texto" character varying(5),
 "entero" integer,
 "numero" numeric(8,6),
 "grande" bigint,
 "doble" double precision,
 "boleano" boolean
);

insert into "all-types" ("texto", "entero", "numero", "grande", "doble", "boleano") values
 ('hello', 4, 3.141592, 1234567890, 1.12e-101, true),
 ('bye', 5, 3.141593, 1234567890, 1.12e-101, false),
 (null, null, null, 0, 0.0, null);