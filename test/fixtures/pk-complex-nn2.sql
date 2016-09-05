create table "pk-complex-nn2" (
 "text-field" character varying,
 "int-field" integer,
 "num-field" numeric,
 "big" bigint,
 "double" double precision,
 primary key ("text-field", "int-field", "num-field")
);

insert into "pk-complex-nn2" ("text-field", "int-field", "num-field", "big", "double") values
 ('hello', 1, 3.1, 1234567890, 1.12e-101),
 ('ciao', 1, 3.2, 1234567890, 1.12e-101),
 ('ciao', 1, 3.1, 1234567890, 1.12e-101);