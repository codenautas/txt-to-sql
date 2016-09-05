create table "pk-very-simple2" (
 "x" character varying(2),
 "y" character varying(2),
 "z" character varying(1),
 primary key ("x", "y")
);

insert into "pk-very-simple2" ("x", "y", "z") values
 ('ab', 'c', 'd'),
 ('a', 'bc', 'e'),
 ('a', 'c', 'f');