create table `example-one-mysql` (
 `text-field` varchar(5),
 `int-field` integer(1),
 `num-field` numeric(8),
 `big` bigint(10),
 `double` double precision(9,7)
);

insert into `example-one-mysql` (`text-field`, `int-field`, `num-field`, `big`, `double`) values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 (null, null, null, 0, 0.0);