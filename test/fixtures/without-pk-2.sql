create table "without-pk-2" (
 "text-field" character varying(5),
 "int-field" integer(1),
 "num-field" numeric(8,6),
 "big" bigint(10),
 "double" double precision(9,7)
);

insert into "without-pk-2" ("text-field", "int-field", "num-field", "big", "double") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 ('hello', null, null, 0, 0.0);