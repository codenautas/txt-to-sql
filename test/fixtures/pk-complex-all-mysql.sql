create table `pk-complex-all-mysql` (
 `'text'field` varchar(5),
 ```int``field` integer(1),
 `"num"1` numeric(1),
 primary key (`'text'field`, ```int``field`, `"num"1`)
);

insert into `pk-complex-all-mysql` (`'text'field`, ```int``field`, `"num"1`) values
 ('hello', 1, 3.141592),
 ('ciao', 2, 3),
 ('hello', 1, 2),
 ('ciao', 2, 4);