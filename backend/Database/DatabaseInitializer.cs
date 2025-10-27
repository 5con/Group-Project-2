using Microsoft.Data.Sqlite;

namespace backend.Database;

/// <summary>
/// Handles database initialization including schema creation and data seeding.
/// </summary>
public class DatabaseInitializer
{
    private readonly string _connectionString;

    public DatabaseInitializer(string connectionString)
    {
        _connectionString = connectionString;
    }

    /// <summary>
    /// Initializes the database by creating schema and seeding data if needed.
    /// </summary>
    public async Task InitializeAsync(bool dropExisting = false)
    {
        if (dropExisting)
        {
            await DropDatabaseAsync();
        }

        await CreateSchemaAsync();
        await SeedDataAsync();
    }

    /// <summary>
    /// Drops all tables in the database.
    /// </summary>
    private async Task DropDatabaseAsync()
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        // Disable foreign keys temporarily
        using var disableFkCommand = connection.CreateCommand();
        disableFkCommand.CommandText = "PRAGMA foreign_keys = OFF;";
        await disableFkCommand.ExecuteNonQueryAsync();

        // Get all table names
        using var tablesCommand = connection.CreateCommand();
        tablesCommand.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';";

        var tables = new List<string>();
        using (var reader = await tablesCommand.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                tables.Add(reader.GetString(0));
            }
        }

        // Drop each table
        foreach (var table in tables)
        {
            using var dropCommand = connection.CreateCommand();
            dropCommand.CommandText = $"DROP TABLE IF EXISTS {table};";
            await dropCommand.ExecuteNonQueryAsync();
        }

        // Re-enable foreign keys and set WAL mode
        using var enableFkCommand = connection.CreateCommand();
        enableFkCommand.CommandText = "PRAGMA foreign_keys = ON;";
        await enableFkCommand.ExecuteNonQueryAsync();

        using var walCommand = connection.CreateCommand();
        walCommand.CommandText = "PRAGMA journal_mode = WAL;";
        await walCommand.ExecuteNonQueryAsync();

        Console.WriteLine("Database dropped successfully.");
    }

    /// <summary>
    /// Creates the database schema from the schema.sql file.
    /// </summary>
    private async Task CreateSchemaAsync()
    {
        var schemaPath = Path.Combine(AppContext.BaseDirectory, "Database", "schema.sql");
        if (!File.Exists(schemaPath))
        {
            throw new FileNotFoundException($"Schema file not found at {schemaPath}");
        }

        var schemaSql = await File.ReadAllTextAsync(schemaPath);

        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        // Enable foreign keys
        using var fkCommand = connection.CreateCommand();
        fkCommand.CommandText = "PRAGMA foreign_keys = ON;";
        await fkCommand.ExecuteNonQueryAsync();

        // Set SQLite to use WAL mode for better concurrency
        using var walCommand = connection.CreateCommand();
        walCommand.CommandText = "PRAGMA journal_mode = WAL;";
        await walCommand.ExecuteNonQueryAsync();

        using var command = connection.CreateCommand();
        command.CommandText = schemaSql;
        await command.ExecuteNonQueryAsync();

        Console.WriteLine("Database schema created successfully.");
    }

    /// <summary>
    /// Seeds the database with initial data from the seed.sql file.
    /// </summary>
    private async Task SeedDataAsync()
    {
        // Check if already seeded by looking for categories
        using (var checkConnection = new SqliteConnection(_connectionString))
        {
            await checkConnection.OpenAsync();

            // First check if Categories table exists
            using var tableCheckCommand = checkConnection.CreateCommand();
            tableCheckCommand.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name='Categories';";
            var tableExists = await tableCheckCommand.ExecuteScalarAsync() != null;

            if (!tableExists)
            {
                Console.WriteLine("Categories table doesn't exist yet, proceeding with seeding.");
            }
            else
            {
                // Categories table exists, check if it has data
                using var checkCommand = checkConnection.CreateCommand();
                checkCommand.CommandText = "SELECT COUNT(*) FROM Categories;";
                var count = Convert.ToInt32(await checkCommand.ExecuteScalarAsync());

                if (count > 0)
                {
                    Console.WriteLine("Database already seeded, skipping seed data.");
                    return;
                }
            }
        }

        var seedPath = Path.Combine(AppContext.BaseDirectory, "Database", "seed.sql");
        if (!File.Exists(seedPath))
        {
            throw new FileNotFoundException($"Seed file not found at {seedPath}");
        }

        var seedSql = await File.ReadAllTextAsync(seedPath);

        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        // Set WAL mode for better concurrency
        using var walCommand = connection.CreateCommand();
        walCommand.CommandText = "PRAGMA journal_mode = WAL;";
        await walCommand.ExecuteNonQueryAsync();

        // Split by semicolon and execute each statement
        var statements = seedSql.Split(new[] { ";\r\n", ";\n" }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var statement in statements)
        {
            var trimmed = statement.Trim();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("--"))
            {
                continue;
            }

            using var command = connection.CreateCommand();
            command.CommandText = trimmed + ";";
            await command.ExecuteNonQueryAsync();
        }

        Console.WriteLine("Database seeded successfully.");
    }

    /// <summary>
    /// Checks if the database exists and is accessible.
    /// </summary>
    public async Task<bool> DatabaseExistsAsync()
    {
        try
        {
            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync();

            // Set WAL mode for better concurrency
            using var walCommand = connection.CreateCommand();
            walCommand.CommandText = "PRAGMA journal_mode = WAL;";
            await walCommand.ExecuteNonQueryAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table';";
            var tableCount = Convert.ToInt32(await command.ExecuteScalarAsync());

            return tableCount > 0;
        }
        catch
        {
            return false;
        }
    }
}

