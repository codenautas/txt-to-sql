drop table if exists "with-drop-table";

create table "with-drop-table" (
 "text-field" character varying(5),
 "int-field" integer,
 "num-field" numeric(8,6),
 "big" bigint,
 "double" double precision
);

insert into "with-drop-table" ("text-field", "int-field", "num-field", "big", "double") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 (null, null, null, 0, 0.0);