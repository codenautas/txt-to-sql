create table "oracle-booleans" (
 "b1" char,
 "b2" char,
 "b3" char,
 primary key ("b1", "b2")
);

insert into "oracle-booleans" ("b1", "b2", "b3") values (1, 1, 1);
insert into "oracle-booleans" ("b1", "b2", "b3") values (1, 0, 0);
insert into "oracle-booleans" ("b1", "b2", "b3") values (0, 0, 0);