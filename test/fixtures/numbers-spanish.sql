create table "numbers-spanish" (
 "provincia" character varying(8),
 "sup_km2" integer,
 "habitantes_miles" numeric(8,3),
 "densidad" numeric(6,2),
 "idh" numeric(4,2),
 "codigo_postal" integer,
 primary key ("provincia")
);

insert into "numbers-spanish" ("provincia", "sup_km2", "habitantes_miles", "densidad", "idh", "codigo_postal") values
 ('Álava', 3037, 321.932, 107.53, 0.99, 01),
 ('Albacete', 14926, 390.032, 26.13, 0.98, 02),
 ('Alicante', 5816, 1825, 334.23, 0.97, 03);