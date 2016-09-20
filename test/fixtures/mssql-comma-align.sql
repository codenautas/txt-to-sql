create table [mssql-comma-align] (
 [text col] varchar(21),
 [num col] numeric(9,6)
);

insert into [mssql-comma-align] ([text col], [num col]) values ('pi'                   , 3.141592);
insert into [mssql-comma-align] ([text col], [num col]) values ('one or two'           ,      1.2);
insert into [mssql-comma-align] ([text col], [num col]) values ('four and five'        ,      4.5);
insert into [mssql-comma-align] ([text col], [num col]) values ('sixty seven dot three',     67.3);
insert into [mssql-comma-align] ([text col], [num col]) values (null                   ,     null);