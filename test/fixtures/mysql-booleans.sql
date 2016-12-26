create table `mysql-booleans` (
 `b1` tinyint,
 `b2` tinyint,
 `b3` tinyint,
 primary key (`b1`, `b2`)
);

insert into `mysql-booleans` (`b1`, `b2`, `b3`) values
 (1, 1, 1),
 (1, 0, 0),
 (0, 0, 0);