create table `mysql-example-one` (
 `text-field` varchar(5),
 `int-field` integer(1),
 `num-field` numeric(8,6),
 `big` bigint(10),
 `double` double precision(9,7)
);

insert into `mysql-example-one` (`text-field`, `int-field`, `num-field`, `big`, `double`) values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 (null, null, null, 0, 0.0);