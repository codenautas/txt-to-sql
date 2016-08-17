create table "fields-unmod" (
 "text-FIELD" text,
 "int-field" integer,
 "Num-Field" numeric,
 "BIG" bigint,
 "douBLe" double precision,
 "INT-FIELD" integer
);

insert into "fields-unmod" ("text-FIELD", "int-field", "Num-Field", "BIG", "douBLe", "INT-FIELD") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101, 4),
 (null, null, null, 0, 0.0, 0);