create table "with-pk-2" (
 "text-field" text,
 "int-field" integer,
 "num-field" numeric,
 "big" bigint,
 "double" double precision,
 primary key ("text-field", "int-field")
);

insert into "with-pk-2" ("text-field", "int-field", "num-field", "big", "double") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 ('hello', 0, null, 0, 0.0);