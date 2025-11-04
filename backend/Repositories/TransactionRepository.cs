using backend.Models;
using Microsoft.Data.Sqlite;

namespace backend.Repositories;

/// <summary>
/// Repository implementation for transaction data access using raw SQL.
/// Follows Single Responsibility Principle - handles only transaction data operations.
/// </summary>
public class TransactionRepository : ITransactionRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public TransactionRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public async Task<int> CreateAsync(Transaction transaction)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            INSERT INTO Transactions (HouseholdId, Date, CategoryId, Amount, Note)
            VALUES (@HouseholdId, @Date, @CategoryId, @Amount, @Note);
            SELECT last_insert_rowid();";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@HouseholdId", transaction.HouseholdId);
        command.Parameters.AddWithValue("@Date", transaction.Date.ToString("yyyy-MM-dd HH:mm:ss"));
        command.Parameters.AddWithValue("@CategoryId", transaction.CategoryId);
        command.Parameters.AddWithValue("@Amount", transaction.Amount);
        command.Parameters.AddWithValue("@Note", transaction.Note);

        var result = await command.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    public async Task<Transaction?> GetByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            SELECT Id, HouseholdId, Date, CategoryId, Amount, Note
            FROM Transactions
            WHERE Id = @Id";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new Transaction
            {
                Id = reader.GetInt32(0),
                HouseholdId = reader.GetInt32(1),
                Date = DateTime.Parse(reader.GetString(2)),
                CategoryId = reader.GetInt32(3),
                Amount = reader.GetDecimal(4),
                Note = reader.GetString(5)
            };
        }

        return null;
    }

    public async Task<IEnumerable<Transaction>> GetByHouseholdIdAsync(int householdId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            SELECT Id, HouseholdId, Date, CategoryId, Amount, Note
            FROM Transactions
            WHERE HouseholdId = @HouseholdId
            ORDER BY Date DESC";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@HouseholdId", householdId);

        var transactions = new List<Transaction>();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            transactions.Add(new Transaction
            {
                Id = reader.GetInt32(0),
                HouseholdId = reader.GetInt32(1),
                Date = DateTime.Parse(reader.GetString(2)),
                CategoryId = reader.GetInt32(3),
                Amount = reader.GetDecimal(4),
                Note = reader.GetString(5)
            });
        }

        return transactions;
    }

    public async Task<IEnumerable<Transaction>> GetByHouseholdIdAndDateRangeAsync(int householdId, DateTime startDate, DateTime endDate)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            SELECT Id, HouseholdId, Date, CategoryId, Amount, Note
            FROM Transactions
            WHERE HouseholdId = @HouseholdId
              AND Date >= @StartDate
              AND Date <= @EndDate
            ORDER BY Date DESC";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@HouseholdId", householdId);
        command.Parameters.AddWithValue("@StartDate", startDate.ToString("yyyy-MM-dd HH:mm:ss"));
        command.Parameters.AddWithValue("@EndDate", endDate.ToString("yyyy-MM-dd HH:mm:ss"));

        var transactions = new List<Transaction>();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            transactions.Add(new Transaction
            {
                Id = reader.GetInt32(0),
                HouseholdId = reader.GetInt32(1),
                Date = DateTime.Parse(reader.GetString(2)),
                CategoryId = reader.GetInt32(3),
                Amount = reader.GetDecimal(4),
                Note = reader.GetString(5)
            });
        }

        return transactions;
    }

    public async Task<IEnumerable<Transaction>> GetByHouseholdIdAndCategoryAsync(int householdId, int categoryId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            SELECT Id, HouseholdId, Date, CategoryId, Amount, Note
            FROM Transactions
            WHERE HouseholdId = @HouseholdId
              AND CategoryId = @CategoryId
            ORDER BY Date DESC";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@HouseholdId", householdId);
        command.Parameters.AddWithValue("@CategoryId", categoryId);

        var transactions = new List<Transaction>();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            transactions.Add(new Transaction
            {
                Id = reader.GetInt32(0),
                HouseholdId = reader.GetInt32(1),
                Date = DateTime.Parse(reader.GetString(2)),
                CategoryId = reader.GetInt32(3),
                Amount = reader.GetDecimal(4),
                Note = reader.GetString(5)
            });
        }

        return transactions;
    }

    public async Task<IEnumerable<Transaction>> GetByHouseholdIdAndMonthAsync(int householdId, int year, int month)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);
        return await GetByHouseholdIdAndDateRangeAsync(householdId, startDate, endDate);
    }

    public async Task<bool> UpdateAsync(Transaction transaction)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            UPDATE Transactions
            SET Date = @Date,
                CategoryId = @CategoryId,
                Amount = @Amount,
                Note = @Note
            WHERE Id = @Id";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", transaction.Id);
        command.Parameters.AddWithValue("@Date", transaction.Date.ToString("yyyy-MM-dd HH:mm:ss"));
        command.Parameters.AddWithValue("@CategoryId", transaction.CategoryId);
        command.Parameters.AddWithValue("@Amount", transaction.Amount);
        command.Parameters.AddWithValue("@Note", transaction.Note);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = "DELETE FROM Transactions WHERE Id = @Id";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    public async Task<Dictionary<int, decimal>> GetSpendingByCategoryAsync(int householdId, DateTime startDate, DateTime endDate)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            SELECT CategoryId, SUM(Amount) as Total
            FROM Transactions
            WHERE HouseholdId = @HouseholdId
              AND Date >= @StartDate
              AND Date <= @EndDate
            GROUP BY CategoryId";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@HouseholdId", householdId);
        command.Parameters.AddWithValue("@StartDate", startDate.ToString("yyyy-MM-dd HH:mm:ss"));
        command.Parameters.AddWithValue("@EndDate", endDate.ToString("yyyy-MM-dd HH:mm:ss"));

        var spending = new Dictionary<int, decimal>();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            spending[reader.GetInt32(0)] = reader.GetDecimal(1);
        }

        return spending;
    }

    public async Task<decimal> GetTotalSpendingAsync(int householdId, DateTime startDate, DateTime endDate)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            SELECT COALESCE(SUM(Amount), 0) as Total
            FROM Transactions
            WHERE HouseholdId = @HouseholdId
              AND Date >= @StartDate
              AND Date <= @EndDate";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@HouseholdId", householdId);
        command.Parameters.AddWithValue("@StartDate", startDate.ToString("yyyy-MM-dd HH:mm:ss"));
        command.Parameters.AddWithValue("@EndDate", endDate.ToString("yyyy-MM-dd HH:mm:ss"));

        var result = await command.ExecuteScalarAsync();
        return Convert.ToDecimal(result);
    }
}

