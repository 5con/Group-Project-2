using backend.Models;
using Microsoft.Data.Sqlite;

namespace backend.Repositories;

/// <summary>
/// Repository implementation for admin operations using raw SQL.
/// </summary>
public class AdminRepository : IAdminRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AdminRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    // User Management
    public async Task<IEnumerable<User>> GetAllUsersAsync()
    {
        var users = new List<User>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, Email, PasswordHash, IsAdmin, Locale, CurrentHouseholdId, CreatedAt 
            FROM Users 
            ORDER BY CreatedAt DESC";

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            users.Add(new User
            {
                Id = reader.GetInt32(0),
                Email = reader.GetString(1),
                PasswordHash = reader.GetString(2),
                IsAdmin = reader.GetInt32(3) == 1,
                Locale = reader.GetString(4),
                CurrentHouseholdId = reader.IsDBNull(5) ? null : reader.GetInt32(5),
                CreatedAt = DateTime.Parse(reader.GetString(6))
            });
        }

        return users;
    }

    public async Task<int> GetTotalUserCountAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM Users";

        var count = await command.ExecuteScalarAsync();
        return Convert.ToInt32(count);
    }

    // Household Management
    public async Task<IEnumerable<Household>> GetAllHouseholdsAsync()
    {
        var households = new List<Household>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, UserId, State, HouseholdSize 
            FROM Households 
            ORDER BY Id";

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            households.Add(new Household
            {
                Id = reader.GetInt32(0),
                UserId = reader.GetInt32(1),
                State = reader.GetString(2),
                HouseholdSize = reader.GetInt32(3)
            });
        }

        return households;
    }

    public async Task<int> GetTotalHouseholdCountAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM Households";

        var count = await command.ExecuteScalarAsync();
        return Convert.ToInt32(count);
    }

    // Budget Management
    public async Task<IEnumerable<Budget>> GetAllBudgetsAsync()
    {
        var budgets = new List<Budget>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, HouseholdId, Methodology, Month, Notes 
            FROM Budgets 
            ORDER BY Month DESC";

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            budgets.Add(new Budget
            {
                Id = reader.GetInt32(0),
                HouseholdId = reader.GetInt32(1),
                Methodology = reader.GetString(2),
                Month = DateTime.Parse(reader.GetString(3)),
                Notes = reader.GetString(4)
            });
        }

        return budgets;
    }

    public async Task<int> GetTotalBudgetCountAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM Budgets";

        var count = await command.ExecuteScalarAsync();
        return Convert.ToInt32(count);
    }

    // Financial Summary Reports
    public async Task<decimal> GetTotalIncomeAcrossAllHouseholdsAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COALESCE(SUM(GrossAmount), 0) FROM Incomes";

        var total = await command.ExecuteScalarAsync();
        return Convert.ToDecimal(total);
    }

    public async Task<decimal> GetTotalExpensesAcrossAllHouseholdsAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COALESCE(SUM(Amount), 0) FROM Expenses";

        var total = await command.ExecuteScalarAsync();
        return Convert.ToDecimal(total);
    }

    public async Task<decimal> GetTotalDebtsAcrossAllHouseholdsAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COALESCE(SUM(Balance), 0) FROM Debts";

        var total = await command.ExecuteScalarAsync();
        return Convert.ToDecimal(total);
    }

    public async Task<int> GetTotalTransactionCountAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM Transactions";

        var count = await command.ExecuteScalarAsync();
        return Convert.ToInt32(count);
    }

    // User Activity Reports
    public async Task<Dictionary<string, int>> GetUserRegistrationsByMonthAsync(int year)
    {
        var registrations = new Dictionary<string, int>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT strftime('%m', CreatedAt) as Month, COUNT(*) as Count
            FROM Users
            WHERE strftime('%Y', CreatedAt) = @year
            GROUP BY strftime('%m', CreatedAt)
            ORDER BY Month";
        command.Parameters.AddWithValue("@year", year.ToString());

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var month = reader.GetString(0);
            var count = reader.GetInt32(1);
            registrations[month] = count;
        }

        return registrations;
    }

    public async Task<Dictionary<string, int>> GetBudgetCreationsByMonthAsync(int year)
    {
        var creations = new Dictionary<string, int>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT strftime('%m', Month) as BudgetMonth, COUNT(*) as Count
            FROM Budgets
            WHERE strftime('%Y', Month) = @year
            GROUP BY strftime('%m', Month)
            ORDER BY BudgetMonth";
        command.Parameters.AddWithValue("@year", year.ToString());

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var month = reader.GetString(0);
            var count = reader.GetInt32(1);
            creations[month] = count;
        }

        return creations;
    }

    // Dashboard Statistics
    public async Task<Dictionary<string, object>> GetDashboardStatisticsAsync()
    {
        var stats = new Dictionary<string, object>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        // Total Users
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT COUNT(*) FROM Users";
            stats["TotalUsers"] = Convert.ToInt32(await command.ExecuteScalarAsync());
        }

        // Total Households
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT COUNT(*) FROM Households";
            stats["TotalHouseholds"] = Convert.ToInt32(await command.ExecuteScalarAsync());
        }

        // Total Budgets
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT COUNT(*) FROM Budgets";
            stats["TotalBudgets"] = Convert.ToInt32(await command.ExecuteScalarAsync());
        }

        // Total Income
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT COALESCE(SUM(GrossAmount), 0) FROM Incomes";
            stats["TotalIncome"] = Convert.ToDecimal(await command.ExecuteScalarAsync());
        }

        // Total Expenses
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT COALESCE(SUM(Amount), 0) FROM Expenses";
            stats["TotalExpenses"] = Convert.ToDecimal(await command.ExecuteScalarAsync());
        }

        // Total Debts
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT COALESCE(SUM(Balance), 0) FROM Debts";
            stats["TotalDebts"] = Convert.ToDecimal(await command.ExecuteScalarAsync());
        }

        // Total Transactions
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT COUNT(*) FROM Transactions";
            stats["TotalTransactions"] = Convert.ToInt32(await command.ExecuteScalarAsync());
        }

        // Average Household Size
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT COALESCE(AVG(HouseholdSize), 0) FROM Households";
            stats["AverageHouseholdSize"] = Convert.ToDouble(await command.ExecuteScalarAsync());
        }

        // Most Common State
        using (var command = connection.CreateCommand())
        {
            command.CommandText = @"
                SELECT State, COUNT(*) as Count 
                FROM Households 
                GROUP BY State 
                ORDER BY Count DESC 
                LIMIT 1";

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                stats["MostCommonState"] = reader.GetString(0);
                stats["MostCommonStateCount"] = reader.GetInt32(1);
            }
        }

        // Most Popular Budget Methodology
        using (var command = connection.CreateCommand())
        {
            command.CommandText = @"
                SELECT Methodology, COUNT(*) as Count 
                FROM Budgets 
                GROUP BY Methodology 
                ORDER BY Count DESC 
                LIMIT 1";

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                stats["MostPopularMethodology"] = reader.GetString(0);
                stats["MostPopularMethodologyCount"] = reader.GetInt32(1);
            }
        }

        return stats;
    }
}

