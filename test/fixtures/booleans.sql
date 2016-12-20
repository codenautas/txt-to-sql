create table "booleans" (
 "b1" boolean,
 "b2" boolean,
 "b3" boolean,
 primary key ("b1", "b2")
);

insert into "booleans" ("b1", "b2", "b3") values
 (1, 1, 1),
 (1, 0, 0),
 (0, 0, 0);