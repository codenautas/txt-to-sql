create table "insert-limit" (
 "texto" character varying(10),
 "numero" integer,
 primary key ("texto")
);

insert into "insert-limit" ("texto", "numero") values
 ('uno', 1),
 ('dos', 2),
 ('tres', 3),
 ('cuatro', 4),
 ('cinco', 5),
 ('seis', 6),
 ('siete', 7),
 ('ocho', 8),
 ('nueve', 9),
 ('diez', 10);

insert into "insert-limit" ("texto", "numero") values
 ('once', 11),
 ('doce', 12),
 ('trece', 13),
 ('catorce', 14),
 ('quince', 15),
 ('dieciseis', 16),
 ('diecisiete', 17),
 ('dieciocho', 18),
 ('diecinueve', 19),
 ('veinte', 20);