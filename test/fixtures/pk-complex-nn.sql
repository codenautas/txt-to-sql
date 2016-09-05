create table "pk-complex-nn" (
 "text-field" character varying(5),
 "int-field" integer(1),
 "num-field" numeric(8,6),
 "big" bigint(10),
 "double" double precision(9,7),
 primary key ("text-field", "int-field")
);

insert into "pk-complex-nn" ("text-field", "int-field", "num-field", "big", "double") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 ('ciao', 1, 3.141592, 1234567890, 1.12e-101),
 ('ciao', 2, 3.141592, 1234567890, 1.12e-101);