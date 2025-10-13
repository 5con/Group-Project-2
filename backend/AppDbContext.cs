using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Household> Households { get; set; }
    public DbSet<Income> Incomes { get; set; }
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<Debt> Debts { get; set; }
    public DbSet<Goal> Goals { get; set; }
    public DbSet<Budget> Budgets { get; set; }
    public DbSet<BudgetItem> BudgetItems { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<StateParam> StateParams { get; set; }
    public DbSet<Setting> Settings { get; set; }
    public DbSet<FinancialModule> FinancialModules { get; set; }
    public DbSet<UserModuleProgress> UserModuleProgress { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure relationships and constraints
        modelBuilder.Entity<Household>()
            .HasOne(h => h.User)
            .WithMany(u => u.Households)
            .HasForeignKey(h => h.UserId);

        modelBuilder.Entity<Income>()
            .HasOne(i => i.Household)
            .WithMany(h => h.Incomes)
            .HasForeignKey(i => i.HouseholdId);

        modelBuilder.Entity<Expense>()
            .HasOne(e => e.Household)
            .WithMany(h => h.Expenses)
            .HasForeignKey(e => e.HouseholdId);

        modelBuilder.Entity<Expense>()
            .HasOne(e => e.Category)
            .WithMany(c => c.Expenses)
            .HasForeignKey(e => e.CategoryId);

        modelBuilder.Entity<Debt>()
            .HasOne(d => d.Household)
            .WithMany(h => h.Debts)
            .HasForeignKey(d => d.HouseholdId);

        modelBuilder.Entity<Goal>()
            .HasOne(g => g.Household)
            .WithMany(h => h.Goals)
            .HasForeignKey(g => g.HouseholdId);

        modelBuilder.Entity<Budget>()
            .HasOne(b => b.Household)
            .WithMany(h => h.Budgets)
            .HasForeignKey(b => b.HouseholdId);

        modelBuilder.Entity<BudgetItem>()
            .HasOne(bi => bi.Budget)
            .WithMany(b => b.BudgetItems)
            .HasForeignKey(bi => bi.BudgetId);

        modelBuilder.Entity<BudgetItem>()
            .HasOne(bi => bi.Category)
            .WithMany(c => c.BudgetItems)
            .HasForeignKey(bi => bi.CategoryId);

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Household)
            .WithMany(h => h.Transactions)
            .HasForeignKey(t => t.HouseholdId);

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Category)
            .WithMany(c => c.Transactions)
            .HasForeignKey(t => t.CategoryId);

        modelBuilder.Entity<Category>()
            .HasOne(c => c.ParentCategory)
            .WithMany(c => c.SubCategories)
            .HasForeignKey(c => c.ParentId);

        modelBuilder.Entity<StateParam>()
            .HasKey(sp => sp.State);

        modelBuilder.Entity<Setting>()
            .HasOne(s => s.Household)
            .WithMany(h => h.Settings)
            .HasForeignKey(s => s.HouseholdId);

        modelBuilder.Entity<UserModuleProgress>()
            .HasKey(ump => new { ump.UserId, ump.ModuleId });

        modelBuilder.Entity<UserModuleProgress>()
            .HasOne(ump => ump.User)
            .WithMany(u => u.ModuleProgress)
            .HasForeignKey(ump => ump.UserId);

        modelBuilder.Entity<UserModuleProgress>()
            .HasOne(ump => ump.Module)
            .WithMany(fm => fm.UserProgress)
            .HasForeignKey(ump => ump.ModuleId);
    }
}

public class User
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Locale { get; set; } = "en-US";
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    public ICollection<Household> Households { get; set; } = new List<Household>();
    public ICollection<UserModuleProgress> ModuleProgress { get; set; } = new List<UserModuleProgress>();
}

public class Household
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string State { get; set; } = string.Empty;
    public int HouseholdSize { get; set; }

    public User User { get; set; } = null!;
    public ICollection<Income> Incomes { get; set; } = new List<Income>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public ICollection<Debt> Debts { get; set; } = new List<Debt>();
    public ICollection<Goal> Goals { get; set; } = new List<Goal>();
    public ICollection<Budget> Budgets { get; set; } = new List<Budget>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<Setting> Settings { get; set; } = new List<Setting>();
}

public class Income
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Cadence { get; set; } = "monthly"; // weekly, biweekly, semimonthly, monthly
    public decimal GrossAmount { get; set; }

    public Household Household { get; set; } = null!;
}

public class Expense
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string Cadence { get; set; } = "monthly";
    public decimal Amount { get; set; }
    public bool IsRecurring { get; set; }

    public Household Household { get; set; } = null!;
    public Category Category { get; set; } = null!;
}

public class Debt
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Type { get; set; } = string.Empty; // credit_card, student_loan, auto_loan, personal_loan, etc.
    public string Name { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal Apr { get; set; }
    public decimal MinPayment { get; set; }

    public Household Household { get; set; } = null!;
}

public class Goal
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Type { get; set; } = string.Empty; // emergency_fund, savings, debt_payoff, etc.
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public DateTime? TargetDate { get; set; }
    public int Priority { get; set; }

    public Household Household { get; set; } = null!;
}

public class Budget
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Methodology { get; set; } = "50/30/20"; // 50/30/20, zero_based, envelope
    public DateTime Month { get; set; }
    public string Notes { get; set; } = string.Empty;

    public Household Household { get; set; } = null!;
    public ICollection<BudgetItem> BudgetItems { get; set; } = new List<BudgetItem>();
}

public class BudgetItem
{
    public int Id { get; set; }
    public int BudgetId { get; set; }
    public int CategoryId { get; set; }
    public decimal PlannedAmount { get; set; }

    public Budget Budget { get; set; } = null!;
    public Category Category { get; set; } = null!;
}

public class Transaction
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public DateTime Date { get; set; }
    public int CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string Note { get; set; } = string.Empty;

    public Household Household { get; set; } = null!;
    public Category Category { get; set; } = null!;
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? ParentId { get; set; }
    public bool IsNeed { get; set; } // true for needs, false for wants

    public Category? ParentCategory { get; set; }
    public ICollection<Category> SubCategories { get; set; } = new List<Category>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public ICollection<BudgetItem> BudgetItems { get; set; } = new List<BudgetItem>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}

public class StateParam
{
    public string State { get; set; } = string.Empty;
    public decimal ColaIndex { get; set; }
    public decimal EstEffectiveTaxRate { get; set; }
}

public class Setting
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public bool StrictMode { get; set; }
    public string GuardrailOverridesJson { get; set; } = "{}";

    public Household Household { get; set; } = null!;
}

public class FinancialModule
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Order { get; set; }
    public string Content { get; set; } = string.Empty; // JSON content for the module

    public ICollection<UserModuleProgress> UserProgress { get; set; } = new List<UserModuleProgress>();
}

public class UserModuleProgress
{
    public int UserId { get; set; }
    public int ModuleId { get; set; }
    public bool IsCompleted { get; set; }
    public int ProgressPercentage { get; set; }
    public DateTime? CompletedAt { get; set; }

    public User User { get; set; } = null!;
    public FinancialModule Module { get; set; } = null!;
}
