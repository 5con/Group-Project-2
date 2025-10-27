-- Financial Management System Database Schema
-- SQLite Database

-- Users table
CREATE TABLE IF NOT EXISTS Users (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Email TEXT NOT NULL UNIQUE,
    PasswordHash TEXT NOT NULL,
    IsAdmin INTEGER NOT NULL DEFAULT 0,
    Locale TEXT NOT NULL DEFAULT 'en-US',
    CurrentHouseholdId INTEGER,
    HasCompletedOnboarding INTEGER NOT NULL DEFAULT 0,
    CreatedAt TEXT NOT NULL,
    FOREIGN KEY (CurrentHouseholdId) REFERENCES Households(Id) ON DELETE SET NULL
);

-- Households table
CREATE TABLE IF NOT EXISTS Households (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    State TEXT NOT NULL,
    HouseholdSize INTEGER NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Income table
CREATE TABLE IF NOT EXISTS Incomes (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    HouseholdId INTEGER NOT NULL,
    Name TEXT NOT NULL,
    Cadence TEXT NOT NULL DEFAULT 'monthly',
    GrossAmount REAL NOT NULL,
    FOREIGN KEY (HouseholdId) REFERENCES Households(Id) ON DELETE CASCADE
);

-- Categories table
CREATE TABLE IF NOT EXISTS Categories (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    ParentId INTEGER,
    IsNeed INTEGER NOT NULL,
    FOREIGN KEY (ParentId) REFERENCES Categories(Id) ON DELETE SET NULL
);

-- Expenses table
CREATE TABLE IF NOT EXISTS Expenses (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    HouseholdId INTEGER NOT NULL,
    Name TEXT NOT NULL,
    CategoryId INTEGER NOT NULL,
    Cadence TEXT NOT NULL DEFAULT 'monthly',
    Amount REAL NOT NULL,
    IsRecurring INTEGER NOT NULL,
    FOREIGN KEY (HouseholdId) REFERENCES Households(Id) ON DELETE CASCADE,
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id) ON DELETE RESTRICT
);

-- Debts table
CREATE TABLE IF NOT EXISTS Debts (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    HouseholdId INTEGER NOT NULL,
    Type TEXT NOT NULL,
    Name TEXT NOT NULL,
    Balance REAL NOT NULL,
    Apr REAL NOT NULL,
    MinPayment REAL NOT NULL,
    FOREIGN KEY (HouseholdId) REFERENCES Households(Id) ON DELETE CASCADE
);

-- Goals table
CREATE TABLE IF NOT EXISTS Goals (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    HouseholdId INTEGER NOT NULL,
    Type TEXT NOT NULL,
    Name TEXT NOT NULL,
    TargetAmount REAL NOT NULL,
    TargetDate TEXT,
    Priority INTEGER NOT NULL,
    FOREIGN KEY (HouseholdId) REFERENCES Households(Id) ON DELETE CASCADE
);

-- Budgets table
CREATE TABLE IF NOT EXISTS Budgets (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    HouseholdId INTEGER NOT NULL,
    Methodology TEXT NOT NULL DEFAULT '50/30/20',
    Month TEXT NOT NULL,
    Notes TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (HouseholdId) REFERENCES Households(Id) ON DELETE CASCADE
);

-- Create index for better query performance on budget dates
CREATE INDEX IF NOT EXISTS idx_budgets_month ON Budgets(Month);

-- BudgetItems table
CREATE TABLE IF NOT EXISTS BudgetItems (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BudgetId INTEGER NOT NULL,
    CategoryId INTEGER NOT NULL,
    PlannedAmount REAL NOT NULL,
    FOREIGN KEY (BudgetId) REFERENCES Budgets(Id) ON DELETE CASCADE,
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id) ON DELETE RESTRICT
);

-- Transactions table
CREATE TABLE IF NOT EXISTS Transactions (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    HouseholdId INTEGER NOT NULL,
    Date TEXT NOT NULL,
    CategoryId INTEGER NOT NULL,
    Amount REAL NOT NULL,
    Note TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (HouseholdId) REFERENCES Households(Id) ON DELETE CASCADE,
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id) ON DELETE RESTRICT
);

-- StateParams table
CREATE TABLE IF NOT EXISTS StateParams (
    State TEXT PRIMARY KEY,
    ColaIndex REAL NOT NULL,
    EstEffectiveTaxRate REAL NOT NULL
);

-- Settings table
CREATE TABLE IF NOT EXISTS Settings (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    HouseholdId INTEGER NOT NULL,
    StrictMode INTEGER NOT NULL DEFAULT 0,
    GuardrailOverridesJson TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (HouseholdId) REFERENCES Households(Id) ON DELETE CASCADE
);

-- FinancialModules table
CREATE TABLE IF NOT EXISTS FinancialModules (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    Description TEXT NOT NULL,
    [Order] INTEGER NOT NULL,
    Content TEXT NOT NULL
);

-- UserModuleProgress table
CREATE TABLE IF NOT EXISTS UserModuleProgress (
    UserId INTEGER NOT NULL,
    ModuleId INTEGER NOT NULL,
    IsCompleted INTEGER NOT NULL DEFAULT 0,
    ProgressPercentage INTEGER NOT NULL DEFAULT 0,
    CompletedAt TEXT,
    PRIMARY KEY (UserId, ModuleId),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (ModuleId) REFERENCES FinancialModules(Id) ON DELETE CASCADE
);


-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_households_userid ON Households(UserId);
CREATE INDEX IF NOT EXISTS idx_incomes_householdid ON Incomes(HouseholdId);
CREATE INDEX IF NOT EXISTS idx_expenses_householdid ON Expenses(HouseholdId);
CREATE INDEX IF NOT EXISTS idx_debts_householdid ON Debts(HouseholdId);
CREATE INDEX IF NOT EXISTS idx_goals_householdid ON Goals(HouseholdId);
CREATE INDEX IF NOT EXISTS idx_budgets_householdid ON Budgets(HouseholdId);
CREATE INDEX IF NOT EXISTS idx_budgetitems_budgetid ON BudgetItems(BudgetId);
CREATE INDEX IF NOT EXISTS idx_transactions_householdid ON Transactions(HouseholdId);
CREATE INDEX IF NOT EXISTS idx_settings_householdid ON Settings(HouseholdId);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(Email);

