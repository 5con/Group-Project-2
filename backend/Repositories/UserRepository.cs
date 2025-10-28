using backend.Models;
using Microsoft.Data.Sqlite;

namespace backend.Repositories;

/// <summary>
/// Repository implementation for User data access using raw SQL.
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public UserRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public async Task<User?> GetByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, Email, PasswordHash, IsAdmin, Locale, CurrentHouseholdId, HasCompletedOnboarding, CreatedAt 
            FROM Users 
            WHERE Id = @id";
        command.Parameters.AddWithValue("@id", id);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapUserFromReader(reader);
        }

        return null;
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, Email, PasswordHash, IsAdmin, Locale, CurrentHouseholdId, HasCompletedOnboarding, CreatedAt 
            FROM Users 
            WHERE LOWER(Email) = LOWER(@email)";
        command.Parameters.AddWithValue("@email", email);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapUserFromReader(reader);
        }

        return null;
    }

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        var users = new List<User>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, Email, PasswordHash, IsAdmin, Locale, CurrentHouseholdId, HasCompletedOnboarding, CreatedAt 
            FROM Users 
            ORDER BY CreatedAt DESC";

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            users.Add(MapUserFromReader(reader));
        }

        return users;
    }

    public async Task<int> CreateAsync(User user)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO Users (Email, PasswordHash, IsAdmin, Locale, CurrentHouseholdId, HasCompletedOnboarding, CreatedAt)
            VALUES (@email, @passwordHash, @isAdmin, @locale, @currentHouseholdId, @hasCompletedOnboarding, @createdAt);
            SELECT last_insert_rowid();";

        command.Parameters.AddWithValue("@email", user.Email);
        command.Parameters.AddWithValue("@passwordHash", user.PasswordHash);
        command.Parameters.AddWithValue("@isAdmin", user.IsAdmin ? 1 : 0);
        command.Parameters.AddWithValue("@locale", user.Locale);
        command.Parameters.AddWithValue("@currentHouseholdId", (object?)user.CurrentHouseholdId ?? DBNull.Value);
        command.Parameters.AddWithValue("@hasCompletedOnboarding", user.HasCompletedOnboarding ? 1 : 0);
        command.Parameters.AddWithValue("@createdAt", user.CreatedAt.ToString("o"));

        var id = await command.ExecuteScalarAsync();
        return Convert.ToInt32(id);
    }

    public async Task UpdateAsync(User user)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            UPDATE Users 
            SET Email = @email, 
                PasswordHash = @passwordHash, 
                IsAdmin = @isAdmin, 
                Locale = @locale, 
                CurrentHouseholdId = @currentHouseholdId,
                HasCompletedOnboarding = @hasCompletedOnboarding
            WHERE Id = @id";

        command.Parameters.AddWithValue("@id", user.Id);
        command.Parameters.AddWithValue("@email", user.Email);
        command.Parameters.AddWithValue("@passwordHash", user.PasswordHash);
        command.Parameters.AddWithValue("@isAdmin", user.IsAdmin ? 1 : 0);
        command.Parameters.AddWithValue("@locale", user.Locale);
        command.Parameters.AddWithValue("@currentHouseholdId", (object?)user.CurrentHouseholdId ?? DBNull.Value);
        command.Parameters.AddWithValue("@hasCompletedOnboarding", user.HasCompletedOnboarding ? 1 : 0);

        await command.ExecuteNonQueryAsync();
    }

    public async Task DeleteAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Users WHERE Id = @id";
        command.Parameters.AddWithValue("@id", id);

        await command.ExecuteNonQueryAsync();
    }

    public async Task<bool> ExistsAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM Users WHERE Id = @id";
        command.Parameters.AddWithValue("@id", id);

        var count = Convert.ToInt32(await command.ExecuteScalarAsync());
        return count > 0;
    }

    private User MapUserFromReader(SqliteDataReader reader)
    {
        return new User
        {
            Id = reader.GetInt32(0),
            Email = reader.GetString(1),
            PasswordHash = reader.GetString(2),
            IsAdmin = reader.GetInt32(3) == 1,
            Locale = reader.GetString(4),
            CurrentHouseholdId = reader.IsDBNull(5) ? null : reader.GetInt32(5),
            HasCompletedOnboarding = reader.GetInt32(6) == 1,
            CreatedAt = DateTime.Parse(reader.GetString(7))
        };
    }
}

