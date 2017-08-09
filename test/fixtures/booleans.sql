create table "booleans" (
 "b1" boolean,
 "b2" boolean,
 "b3" boolean,
 "b4" boolean,
 primary key ("b1", "b2")
);

insert into "booleans" ("b1", "b2", "b3", "b4") values
 (true, true, true, true),
 (true, false, false, null),
 (false, false, false, null);