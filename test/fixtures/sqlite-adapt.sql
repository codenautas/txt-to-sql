create table "sqlite-adapt" (
 "texts" text(20),
 "integers" integer(1)
);

insert into "sqlite-adapt" ("texts", "integers") values
 ('dos palabras', 1),
 ('una comilla''simple', 2),
 ('dos comillas"dobles"', 3),
 ('varios `, \ y /', 4),
 (null, 5),
 ('% pct', null),
 (null, null);