create table `mysql-adapt` (
 `texts` varchar(20),
 `integers` integer(1)
);

insert into `mysql-adapt` (`texts`, `integers`) values
 ('dos palabras', 1),
 ('una comilla''simple', 2),
 ('dos comillas"dobles"', 3),
 ('varios `, \ y /', 4),
 (null, 5),
 ('% pct', null),
 (null, null);