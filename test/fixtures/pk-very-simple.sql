create table "pk-very-simple" (
 "x" text,
 "y" text,
 "z" text,
 primary key ("x", "y")
);

insert into "pk-very-simple" ("x", "y", "z") values
 ('ab', 'c', 'd'),
 ('a', 'bc', 'e'),
 ('a', 'b', 'c');