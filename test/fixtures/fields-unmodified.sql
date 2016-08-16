create table "fields-unmodified" (
 "text-FIELD" text,
 "int-field" integer,
 "Num-Field" numeric,
 "BIG" bigint,
 "douBLe" double precision
);

insert into "fields-unmodified" ("text-FIELD", "int-field", "Num-Field", "BIG", "douBLe") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 (null, null, null, 0, 0.0);