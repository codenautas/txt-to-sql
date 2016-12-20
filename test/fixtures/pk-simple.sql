create table "pk-simple" (
 "text-field" character varying(5),
 "int-field" integer,
 "num-field" numeric(8,6),
 "big" bigint,
 "double" double precision,
 primary key ("text-field")
);

insert into "pk-simple" ("text-field", "int-field", "num-field", "big", "double") values
 ('hello', 4, 3.141592, 1234567890, 1.12e-101),
 ('bye', 5, 3.141593, 1234567890, 1.12e-101),
 ('ciao', null, null, 0, 0.0);