create table "pk-complex" (
 "text-field" character varying(5),
 "int-field" integer,
 "num" numeric(8,6),
 "big" bigint,
 "double" double precision,
 primary key ("text-field", "int-field", "num")
);

insert into "pk-complex" ("text-field", "int-field", "num", "big", "double") values
 ('hello', 4, 3.141592, 1234567890, 1.12e-101),
 ('ciao', 2, 3, 0, 0.0),
 ('hello', 4, 2, null, null),
 ('ciao', 2, 4, 0, 0.0);