create table "pk-space-simple" (
 "x" character varying,
 "y" character varying,
 "z" character varying,
 primary key ("x", "y")
);

insert into "pk-space-simple" ("x", "y", "z") values
 ('a', 'c', 'd'),
 ('a', 'b/\s+/c', 'd'),
 ('a/\s+/b', 'c', 'd');