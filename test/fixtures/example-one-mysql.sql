create table `example-one-mysql` (
 `text-field` varchar,
 `int-field` integer,
 `num-field` numeric,
 `big` bigint,
 `double` double precision
);

insert into `example-one-mysql` (`text-field`, `int-field`, `num-field`, `big`, `double`) values
 ('hello', 1, 3.141592, 1234567890, 1.12e-101),
 (null, null, null, 0, 0.0);