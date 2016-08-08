create table "pk-space-simple" (
 "x" text,
 "y" text,
 "z" text,
 primary key ("x", "y")
);

insert into "pk-space-simple" ("x", "y", "z") values
 ('a', 'c', 'd'),
 ('a', 'b/\s+/c', 'd'),
 ('a/\s+/b', 'c', 'd');