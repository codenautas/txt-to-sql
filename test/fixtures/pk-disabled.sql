create table "pk-disabled" (
 "text-field" character varying(5),
 "int-field" integer,
 "num""1""" numeric(8,6)
);

insert into "pk-disabled" ("text-field", "int-field", "num""1""") values
 ('hello', 1, 3.141592),
 ('ciao', 2, 3),
 ('hello', 1, 2),
 ('ciao', 2, 4);