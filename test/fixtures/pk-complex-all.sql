create table "pk-complex-all" (
 "text-field" character varying(5),
 "int-field" integer,
 "num""1""" numeric(8,6),
 primary key ("text-field", "int-field", "num""1""")
);

insert into "pk-complex-all" ("text-field", "int-field", "num""1""") values
 ('hello', 4, 3.141592),
 ('ciao', 2, 3),
 ('hello', 4, 2),
 ('ciao', 2, 4);