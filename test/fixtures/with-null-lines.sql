create table "with-null-lines" (
 "c1" character varying(9),
 "i1" integer,
 "i2" integer
);

insert into "with-null-lines" ("c1", "i1", "i2") values
 ('hello', 1, 2),
 ('bye', 2, 2),
 ('hi', 3, 2),
 ('greetings', 4, 2);