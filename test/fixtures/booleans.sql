create table "booleans" (
 "b1" boolean,
 "b2" boolean,
 "b3" boolean,
 primary key ("b1", "b2")
);

insert into "booleans" ("b1", "b2", "b3") values
 (true, true, true),
 (true, false, false),
 (false, false, false);