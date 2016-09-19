create table `mysql-pk-complex-all` (
 `'text'field` varchar(5),
 ```int``field` integer,
 `"num"1` numeric(8,6),
 primary key (`'text'field`, ```int``field`, `"num"1`)
);

insert into `mysql-pk-complex-all` (`'text'field`, ```int``field`, `"num"1`) values
 ('hello', 1, 3.141592),
 ('ciao', 2, 3),
 ('hello', 1, 2),
 ('ciao', 2, 4);