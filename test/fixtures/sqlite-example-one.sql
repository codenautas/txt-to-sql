create table "sqlite-example-one" (
 "text-col" text(5),
 "int-col" integer,
 "num-col" numeric(8,6),
 "big-col" integer,
 "double-col" real
);

insert into "sqlite-example-one" ("text-col", "int-col", "num-col", "big-col", "double-col") values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 (null, null, null, 0, 0.0);