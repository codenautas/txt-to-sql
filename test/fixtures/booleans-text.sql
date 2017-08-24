create table "booleans-text" (
 "b1" character varying(1),
 "b2" integer,
 "b3" character varying(1),
 primary key ("b1", "b2")
);

insert into "booleans-text" ("b1", "b2", "b3") values
 ('t', 1, 'y'),
 ('t', 0, 'n'),
 ('f', 0, 'n');