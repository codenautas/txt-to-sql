create table "pk-very-simple2" (
 "x" character varying,
 "y" character varying,
 "z" character varying,
 primary key ("x", "y")
);

insert into "pk-very-simple2" ("x", "y", "z") values
 ('ab', 'c', 'd'),
 ('a', 'bc', 'e'),
 ('a', 'c', 'f');