create table "pk-enabled" (
 "f1" character varying(5),
 "f2" integer,
 "f3" numeric(8,6),
 primary key ("f1", "f2", "f3")
);

insert into "pk-enabled" ("f1", "f2", "f3") values
 ('hello', 1, 3.141592),
 ('ciao', 4, 3),
 ('hello', 1, 2),
 ('ciao', 4, 4);