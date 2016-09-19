create table [mssql-example-one] (
 [text col] varchar(5),
 [int col] integer,
 [num col] numeric(8,6),
 [big col] bigint,
 [double col] real
);

insert into [mssql-example-one] ([text col], [int col], [num col], [big col], [double col]) values ('hello', 1, 3.141592, 1234567890, 1.12e-101);
insert into [mssql-example-one] ([text col], [int col], [num col], [big col], [double col]) values (null, null, null, 0, 0.0);