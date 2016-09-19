create table "fields-unmod" (
 "text-FIELD" character varying(5),
 "int-field" integer,
 "Num-Field" numeric(8,6),
 "BIG" bigint,
 "douBLe" double precision,
 "INT-FIELD" integer
);

insert into "fields-unmod" ("text-FIELD", "int-field", "Num-Field", "BIG", "douBLe", "INT-FIELD") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101, 4),
 (null, null, null, 0, 0.0, 0);