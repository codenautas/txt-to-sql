create table "comma-align" (
 "text-field" character varying,
 "int-field" integer,
 "numerico-el-1" numeric,
 primary key ("text-field", "int-field", "numerico-el-1")
);

insert into "comma-align" ("text-field", "int-field", "numerico-el-1") values
 ('hello'          ,  1, 3.141592),
 ('ciao'           ,  2,        3),
 ('hello my friend',  1,        2),
 ('ciao'           ,  2,        4),
 ('hola mi amigo'  , 32,       34);