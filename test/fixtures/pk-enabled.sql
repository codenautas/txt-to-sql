create table "pk-enabled" (
 "f1" text,
 "f2" integer,
 "f3" numeric,
 primary key ("f1", "f2", "f3")
);

insert into "pk-enabled" ("f1", "f2", "f3") values
 ('hello', 1, 3.141592),
 ('ciao', 2, 3),
 ('hello', 1, 2),
 ('ciao', 2, 4);