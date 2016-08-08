create table "pk-very-simple2" (
 "x" text,
 "y" text,
 "z" text,
 primary key ("x", "y")
);

insert into "pk-very-simple2" ("x", "y", "z") values
 ('ab', 'c', 'd'),
 ('a', 'bc', 'e'),
 ('a', 'c', 'f');