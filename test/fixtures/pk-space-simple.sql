create table "pk-space-simple" (
 "x" character varying(7),
 "y" character varying(7),
 "z" character varying(1),
 primary key ("x", "y")
);

insert into "pk-space-simple" ("x", "y", "z") values
 ('a', 'c', 'd'),
 ('a', 'b/\s+/c', 'd'),
 ('a/\s+/b', 'c', 'e');