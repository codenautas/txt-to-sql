create table "pk-very-simple" (
 "x" character varying,
 "y" character varying,
 "z" character varying,
 primary key ("x", "y")
);

insert into "pk-very-simple" ("x", "y", "z") values
 ('ab', 'c', 'd'),
 ('a', 'bc', 'e'),
 ('a', 'b', 'c');