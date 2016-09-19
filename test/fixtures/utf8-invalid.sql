create table "utf8-invalid" (
 "int-field" integer,
 "text-field" character varying(16)
);

insert into "utf8-invalid" ("int-field", "text-field") values
 (1, '¡éste es el año!');