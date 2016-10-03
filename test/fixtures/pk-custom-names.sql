create table "pk-custom-names" (
 "CustomV" character varying(2),
 "CustomX" character varying(2),
 "YCustom" character varying(2),
 "ZCustom" character varying(1),
 primary key ("CustomX", "YCustom")
);

insert into "pk-custom-names" ("CustomV", "CustomX", "YCustom", "ZCustom") values
 ('ab', 'AB', 'c', 'd'),
 ('a', 'A', 'bc', 'e'),
 ('a', 'A', 'b', 'c');