create table "sqlite-pk-complex-all" (
 "TextCol" text(5),
 "integerCol" integer(1),
 "NumericWith""quotes""" numeric(8,6),
 primary key ("TextCol", "integerCol", "NumericWith""quotes""")
);

insert into "sqlite-pk-complex-all" ("TextCol", "integerCol", "NumericWith""quotes""") values
 ('hello', 1, 3.141592),
 ('ciao', 2, 3),
 ('hello', 1, 2),
 ('ciao', 2, 4);