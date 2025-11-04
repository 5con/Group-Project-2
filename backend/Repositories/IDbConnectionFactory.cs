using Microsoft.Data.Sqlite;

namespace backend.Repositories;

/// <summary>
/// Factory interface for creating database connections.
/// Follows the Dependency Inversion Principle by abstracting the database connection creation.
/// </summary>
public interface IDbConnectionFactory
{
    /// <summary>
    /// Creates a new SQLite database connection.
    /// </summary>
    /// <returns>A new SqliteConnection instance.</returns>
    SqliteConnection CreateConnection();
}

