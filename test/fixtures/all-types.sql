create table "all-types" (
 "texto" character varying(5),
 "entero" integer,
 "numero" numeric(8,6),
 "grande" bigint,
 "doble" double precision,
 "boleano" boolean,
 "fecha" date,
 "marcadetiempo" timestamp
);

insert into "all-types" ("texto", "entero", "numero", "grande", "doble", "boleano", "fecha", "marcadetiempo") values
 ('hello',    4, 3.141592, 1234567890, 1.12e-101,  true, '2011-4-15', '1969-05-06 00:10:00 -3:00'),
 ('bye'  ,    5, 3.141593, 1234567890, 1.12e-101, false, '14-2-1999',       '2016-11-21 10:00:01'),
 (null   , null,     null,          0,       0.0,  null,        null,                        null);