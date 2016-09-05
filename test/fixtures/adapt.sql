create table "adapt" (
 "texts" text,
 "integers" integer
);

insert into "adapt" ("texts", "integers") values
 ('dos palabras', 1),
 ('una comilla''simple', 2),
 ('dos comillas"dobles"', 3),
 ('varios `, \ y /', 4);