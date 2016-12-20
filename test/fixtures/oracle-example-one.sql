create table "oracle-example-one" (
 "text col" varchar2(5),
 "int col" integer,
 "num col" number(8,6),
 "big col" long,
 "double col" binary_double
);

insert into "oracle-example-one" ("text col", "int col", "num col", "big col", "double col") values ('hello', 1, 3.141592, 1234567890, 1.12e-101);
insert into "oracle-example-one" ("text col", "int col", "num col", "big col", "double col") values ('hella', 4, 3.141594, 1234567890, 1.12e-101);
insert into "oracle-example-one" ("text col", "int col", "num col", "big col", "double col") values (null, null, null, 0, 0.0);