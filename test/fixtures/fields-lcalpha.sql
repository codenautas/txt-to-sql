create table "fields_lcalpha" (
 "conene" text,
 "esdrujulo" integer,
 "masdias" numeric,
 "faltanaeeiiuoooo" bigint,
 "_1numeroyacento" double precision,
 "maas" integer
);

insert into "fields_lcalpha" ("conene", "esdrujulo", "masdias", "faltanaeeiiuoooo", "_1numeroyacento", "maas") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101, null),
 ('no toca botón', 2, 4.141592, 2234567890, 2.12e-101, null),
 (null, null, null, 0, 0.0, null);