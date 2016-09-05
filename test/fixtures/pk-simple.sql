create table "pk-simple" (
 "text-field" character varying,
 "int-field" integer,
 "num-field" numeric,
 "big" bigint,
 "double" double precision,
 primary key ("text-field")
);

insert into "pk-simple" ("text-field", "int-field", "num-field", "big", "double") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 ('ciao', null, null, 0, 0.0);