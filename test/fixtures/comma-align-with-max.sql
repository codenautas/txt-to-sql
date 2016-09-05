create table "comma-align-with-max" (
 "text-field" character varying,
 "int-field" integer,
 "numerico-el-1" numeric,
 primary key ("text-field", "int-field")
);

insert into "comma-align-with-max" ("text-field", "int-field", "numerico-el-1") values
 ('hello'       ,  1, 3.141592),
 ('ciao'        ,  2,        3),
 ('hola mi amigo', 5,       34),
 ('hello my friend', 1,      2),
 ('ciao'        , 32,        4);