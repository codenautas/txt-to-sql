create table "col-align-nulls" (
 "text-field" text,
 "int-field" integer,
 "numerico-el-1" numeric,
 "todosnulos" integer,
 "numerico-el-2" numeric
);

insert into "col-align-nulls" ("text-field", "int-field", "numerico-el-1", "todosnulos", "numerico-el-2") values
 ('hello'          ,    1, 3.141592, null,   null),
 (null             ,    2,        3, null,  212.2),
 ('hello my friend',    1,        2, null,   null),
 ('ciao'           , null,        4, null,   null),
 ('hola mi amigo'  ,   32,     null, null, 444.43);