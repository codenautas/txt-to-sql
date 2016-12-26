create table "oracle-with-null-lines" (
 "c1" varchar2(9),
 "i1" integer,
 "i2" integer
);

insert into "oracle-with-null-lines" ("c1", "i1", "i2") values ('hello', 1, 4);
insert into "oracle-with-null-lines" ("c1", "i1", "i2") values ('bye', 2, 3);
insert into "oracle-with-null-lines" ("c1", "i1", "i2") values ('hi', 3, 4);
insert into "oracle-with-null-lines" ("c1", "i1", "i2") values ('greetings', 4, 4);
insert into "oracle-with-null-lines" ("c1", "i1", "i2") values ('hey', null, null);