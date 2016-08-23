create table "pk-disabled" (
 "text-field" text,
 "int-field" integer,
 "num""1""" numeric
);

insert into "pk-disabled" ("text-field", "int-field", "num""1""") values
 ('hello', 1, 3.141592),
 ('ciao', 2, 3),
 ('hello', 1, 2),
 ('ciao', 2, 4);