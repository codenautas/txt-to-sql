create table "pk-complex-nn2" (
 "text-field" character varying(5),
 "int-field" integer(1),
 "num-field" numeric(3,1),
 "big" bigint(10),
 "double" double precision(9,7),
 primary key ("text-field", "int-field", "num-field")
);

insert into "pk-complex-nn2" ("text-field", "int-field", "num-field", "big", "double") values
 ('hello', 1, 3.1, 1234567890, 1.12e-101),
 ('ciao', 1, 3.2, 1234567890, 1.12e-101),
 ('ciao', 1, 3.1, 1234567890, 1.12e-101);