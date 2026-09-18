BEGIN TRANSACTION;
ALTER TABLE [Files] DROP CONSTRAINT [FK_Files_Users_UploadedById];

ALTER TABLE [SuggestFiles] DROP CONSTRAINT [FK_SuggestFiles_Organizations_OrganizationId];

DECLARE @var0 sysname;
SELECT @var0 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[SuggestFiles]') AND [c].[name] = N'ReportType');
IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [SuggestFiles] DROP CONSTRAINT [' + @var0 + '];');
ALTER TABLE [SuggestFiles] DROP COLUMN [ReportType];

ALTER TABLE [SuggestFiles] ADD [FileId] int NULL;

DECLARE @var1 sysname;
SELECT @var1 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Files]') AND [c].[name] = N'UpdatedAt');
IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [Files] DROP CONSTRAINT [' + @var1 + '];');
ALTER TABLE [Files] ADD DEFAULT (GETUTCDATE()) FOR [UpdatedAt];

DECLARE @var2 sysname;
SELECT @var2 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Files]') AND [c].[name] = N'IsActive');
IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [Files] DROP CONSTRAINT [' + @var2 + '];');
ALTER TABLE [Files] ADD DEFAULT CAST(1 AS bit) FOR [IsActive];

DECLARE @var3 sysname;
SELECT @var3 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Files]') AND [c].[name] = N'FileUuid');
IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [Files] DROP CONSTRAINT [' + @var3 + '];');
ALTER TABLE [Files] ALTER COLUMN [FileUuid] varchar(50) NOT NULL;

DECLARE @var4 sysname;
SELECT @var4 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Files]') AND [c].[name] = N'FileType');
IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [Files] DROP CONSTRAINT [' + @var4 + '];');
ALTER TABLE [Files] ALTER COLUMN [FileType] varchar(100) NOT NULL;

DECLARE @var5 sysname;
SELECT @var5 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Files]') AND [c].[name] = N'CreatedAt');
IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [Files] DROP CONSTRAINT [' + @var5 + '];');
ALTER TABLE [Files] ADD DEFAULT (GETUTCDATE()) FOR [CreatedAt];

ALTER TABLE [Files] ADD [UserId] uniqueidentifier NULL;

CREATE INDEX [IX_SuggestFiles_FileId] ON [SuggestFiles] ([FileId]);

CREATE UNIQUE INDEX [IX_File_FileUuid] ON [Files] ([FileUuid]);

CREATE INDEX [IX_Files_UserId] ON [Files] ([UserId]);

ALTER TABLE [Files] ADD CONSTRAINT [FK_Files_Users_UploadedById] FOREIGN KEY ([UploadedById]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION;

ALTER TABLE [Files] ADD CONSTRAINT [FK_Files_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]);

ALTER TABLE [SuggestFiles] ADD CONSTRAINT [FK_SuggestFiles_Files_FileId] FOREIGN KEY ([FileId]) REFERENCES [Files] ([Id]) ON DELETE SET NULL;

ALTER TABLE [SuggestFiles] ADD CONSTRAINT [FK_SuggestFiles_Organizations_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [Organizations] ([Id]) ON DELETE SET NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250822082113_...', N'9.0.0');

COMMIT;
GO

