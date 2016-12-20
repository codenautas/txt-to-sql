create table "fields_lcalpha" (
 "conene" character varying(13),
 "esdrujulo" integer,
 "masdias" numeric(8,6),
 "faltanaeeiiuoooo" bigint,
 "_1numeroyacento" double precision,
 "maas" integer
);

insert into "fields_lcalpha" ("conene", "esdrujulo", "masdias", "faltanaeeiiuoooo", "_1numeroyacento", "maas") values
 ('bello', 1, 3.141592, 1234567890, 1.12e-101, null),
 ('yo toca botón', 4, 4.141592, 2234567890, 2.12e-101, null),
 (null, null, null, 0, 0.0, null);