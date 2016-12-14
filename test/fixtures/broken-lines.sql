create table "broken-lines" (
 "txt1" character varying(3),
 "txt2" character varying(13),
 "txt3" character varying(4),
 primary key ("txt1")
);

insert into "broken-lines" ("txt1", "txt2", "txt3") values
 ('uno', 'dos', 'tres'),
 ('una', 'linea\npartida', 'tres');