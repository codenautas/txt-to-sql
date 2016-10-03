create table "pk-custom" (
 "v" character varying(2),
 "x" character varying(2),
 "y" character varying(2),
 "z" character varying(1),
 primary key ("x", "y")
);

insert into "pk-custom" ("v", "x", "y", "z") values
 ('ab', 'AB', 'c', 'd'),
 ('a', 'A', 'bc', 'e'),
 ('a', 'A', 'b', 'c');