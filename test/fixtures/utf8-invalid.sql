create table "utf8-invalid" (
 "int-field" integer(1),
 "text-field" character varying(18)
);

insert into "utf8-invalid" ("int-field", "text-field") values
 (1, 'puÃ±o y letra "â(¡"');