# Financial Management System - Backend

## Architecture Overview

This backend follows **SOLID principles** and implements a **clean architecture** with clear separation of concerns using the **Repository Pattern**.

## Project Structure

```
backend/
├── Models/              # Data models (POCOs)
├── Repositories/        # Data access layer (raw SQL)
├── Services/           # Business logic layer
├── DTOs/               # Data transfer objects for API responses
├── Controllers/        # HTTP request handlers
├── Database/           # Schema and seed scripts
└── Program.cs          # Application entry point & DI setup
```

## Technology Stack

- **.NET 9.0** - Modern C# web framework
- **SQLite** - Lightweight embedded database
- **Microsoft.Data.Sqlite** - Raw SQL data access
- **JWT Authentication** - Token-based auth
- **ASP.NET Core** - Web API framework

## Architecture Layers

### 1. Models Layer
Plain C# objects representing database tables:
- `User`, `Household`, `Income`, `Expense`, `Debt`, `Goal`
- `Budget`, `BudgetItem`, `Transaction`, `Category`
- `StateParam`, `Setting`, `FinancialModule`, `UserModuleProgress`

### 2. Data Access Layer (Repositories)
**Interfaces:** Define contracts for data operations
**Implementations:** Execute raw SQL queries using `SqliteConnection`

Key repositories:
- `IUserRepository` - User management
- `IHouseholdRepository` - Household and related entities (incomes, expenses, debts, goals)
- `IBudgetRepository` - Budget generation and tracking
- `IReferenceDataRepository` - Static reference data (categories, states, modules)
- `IAdminRepository` - Admin reporting and analytics

### 3. Business Logic Layer (Services)
- `IBudgetService` - Budget generation algorithms (50/30/20, zero-based, envelope)
- Debt snowball projection calculations
- Income cadence conversions

### 4. Presentation Layer (Controllers)
- `OnboardingController` - User registration and household setup
- `BudgetController` - Budget generation and management
- `ReferenceDataController` - Public reference data
- `AdminController` - Admin-only reporting and management

### 5. Data Transfer Objects (DTOs)
Clean API responses without circular references:
- `HouseholdResponse` - Flattened household data
- `BudgetResponse` - Budget with calculated summaries
- `AdminReportResponse` - Various admin report structures

## Database Management

### Schema (`Database/schema.sql`)
Complete DDL with:
- Table definitions
- Foreign key constraints
- Indexes for performance

### Seeding (`Database/seed.sql`)
Initial data:
- 17 spending categories (needs vs. wants)
- 50 US state parameters (COLA index, tax rates)
- 12 financial literacy modules
- Admin account (email: `admin@example.com`)
- 3 test households with complete financial data

### Initialization (`Database/DatabaseInitializer.cs`)
- Drops database in development mode (prevents schema drift)
- Executes schema.sql
- Seeds data if database is empty
- Runs on application startup

## SOLID Principles

### Single Responsibility Principle (SRP)
- Each class has one reason to change
- Repositories handle data access only
- Services handle business logic only
- Controllers handle HTTP concerns only

### Open/Closed Principle (OCP)
- Open for extension via interfaces
- Closed for modification (add new repos without changing existing)

### Liskov Substitution Principle (LSP)
- All repository implementations are interchangeable
- Mock implementations possible for testing

### Interface Segregation Principle (ISP)
- Small, focused interfaces
- Clients depend only on methods they use

### Dependency Inversion Principle (DIP)
- High-level modules depend on abstractions (interfaces)
- Dependencies injected via constructors
- Configured in `Program.cs`

## API Endpoints (80+ Total)

### Onboarding
- `POST /api/onboarding` - Create household (with password)
- `GET /api/onboarding/household/{id}` - Get household
- `GET /api/onboarding/household/by-email/{email}` - Get by email
- `PUT /api/onboarding/household/{id}` - Update household

### Budget Management
- `POST /api/budget/generate` - Generate new budget
- `GET /api/budget/{id}` - Get budget by ID
- `GET /api/budget/household/{id}` - Get household budgets
- `PUT /api/budget/{id}` - Update budget
- `DELETE /api/budget/{id}` - Delete budget
- `POST /api/budget/debt/avalanche` - Debt avalanche projection ✨
- `POST /api/budget/debt/compare` - Compare snowball vs avalanche ✨
- `GET /api/budget/{id}/projection/12-month` - 12-month projection ✨
- `POST /api/budget/validate` - Validate budget with guardrails ✨
- `POST /api/budget/guardrails` - Check COLA-adjusted guardrails ✨
- `POST /api/budget/suggestions` - Get reallocation suggestions ✨
- `POST /api/budget/recalculate` - Live budget recalculation ✨

### Transaction Tracking ✨ NEW
- `POST /api/transaction` - Create transaction
- `GET /api/transaction/{id}` - Get transaction
- `GET /api/transaction/household/{id}` - List transactions
- `GET /api/transaction/household/{id}/month/{year}/{month}` - Monthly transactions
- `PUT /api/transaction/{id}` - Update transaction
- `DELETE /api/transaction/{id}` - Delete transaction
- `GET /api/transaction/household/{id}/summary` - Spending summary
- `GET /api/transaction/budget/{id}/vs-actual` - Budget vs actual

### Goal Management ✨ NEW
- `POST /api/goal` - Create goal
- `GET /api/goal/{id}` - Get goal with progress
- `GET /api/goal/household/{id}` - List goals
- `GET /api/goal/household/{id}/dashboard` - Goal dashboard
- `PUT /api/goal/{id}` - Update goal
- `DELETE /api/goal/{id}` - Delete goal

### Reference Data
- `GET /api/referencedata/states` - All state parameters
- `GET /api/referencedata/categories` - All spending categories
- `GET /api/referencedata/benchmarks/{state}` - State-specific benchmarks
- `GET /api/referencedata/financial-modules` - Educational modules
- `GET /api/referencedata/financial-modules/user/{userId}` - Modules with progress ✨
- `GET /api/referencedata/financial-modules/user/{userId}/progress` - Overall progress ✨
- `POST /api/referencedata/financial-modules/progress` - Update progress ✨
- `GET /api/referencedata/financial-modules/{moduleId}/user/{userId}/progress` - Module progress ✨
- `DELETE /api/referencedata/financial-modules/{moduleId}/user/{userId}/progress` - Reset progress ✨

### Dashboard & Recommendations ✨ NEW
- `GET /api/dashboard/household/{id}/top-actions` - Top 3 recommendations
- `GET /api/dashboard/household/{id}/tips` - Contextual tips
- `GET /api/dashboard/household/{id}/benchmarks` - Benchmark comparison
- `GET /api/dashboard/household/{id}/quick-wins` - Quick win opportunities
- `GET /api/dashboard/household/{id}/health-score` - Financial health score
- `GET /api/dashboard/household/{id}/recommendations` - Complete dashboard

### Export ✨ NEW
- `GET /api/export/transactions/{householdId}/csv` - Export transactions CSV
- `GET /api/export/budget/{budgetId}/csv` - Export budget CSV
- `GET /api/export/household/{householdId}/json` - Export household JSON
- `GET /api/export/goals/{householdId}/csv` - Export goals CSV

### Admin (Protected) 🔒
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/{id}` - Get specific user
- `GET /api/admin/households` - List all households
- `GET /api/admin/households/{id}` - Get specific household
- `GET /api/admin/budgets` - List all budgets
- `GET /api/admin/reports/financial-summary` - Aggregated financials
- `GET /api/admin/reports/user-activity?year={year}` - Usage statistics
- `GET /api/admin/reports/dashboard` - Comprehensive dashboard

✨ = New endpoint | 🔒 = Requires admin authorization

## Running the Application

### Prerequisites
- .NET 9.0 SDK
- Any IDE (Visual Studio, VS Code, Rider)

### Development
```bash
cd backend
dotnet restore
dotnet run
```

The application will:
1. Drop and recreate the database (dev mode)
2. Execute schema.sql
3. Seed initial data
4. Start the API server on http://localhost:5000

### Configuration
Edit `appsettings.json` or `appsettings.Development.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=financialapp.db"
  },
  "Jwt": {
    "Key": "YourSuperSecretKeyThatIsAtLeast32CharactersLong"
  }
}
```

## Testing

### Test Accounts
**Admin:**
- Email: `admin@example.com`
- Role: Administrator

**Regular Users:**
- `john.doe@example.com` - California household, 2 people
- `jane.smith@example.com` - Texas household, 4 people
- `bob.johnson@example.com` - New York household, 1 person

### Manual Testing
Use `backend.http` file with VS Code REST Client extension, or tools like:
- Postman
- Insomnia
- curl
- Thunder Client

### Example Request
```http
POST http://localhost:5000/api/budget/generate
Content-Type: application/json

{
  "householdId": 1,
  "methodology": "50/30/20",
  "month": 12,
  "year": 2024
}
```

## Database Schema Highlights

### Users Table
- Includes `IsAdmin` flag for role-based access
- Tracks `CurrentHouseholdId` for active household
- Stores JWT credentials (PasswordHash)

### Households Table
- Links to User
- Stores State for COLA/tax calculations
- Parent for all financial data

### Budget Generation
- Three methodologies: 50/30/20, zero-based, envelope
- Automatic category distribution based on methodology
- Calculates needs, wants, and savings breakdowns

### State Parameters
- Cost of Living Adjustment (COLA) index per state
- Estimated effective tax rates
- Used for income calculations and benchmarks

## Development Notes

### Raw SQL Benefits
- **Performance**: No ORM overhead
- **Transparency**: Explicit queries, easier debugging
- **Control**: Fine-tuned optimization
- **Learning**: Clear understanding of database operations

### Why Repository Pattern?
- **Testability**: Easy to mock for unit tests
- **Flexibility**: Swap implementations without changing business logic
- **Maintainability**: Centralized data access code
- **SOLID**: Follows dependency inversion principle

### DTOs vs Models
- **Models**: Match database structure
- **DTOs**: Match API contract
- Prevents circular references in JSON serialization
- Allows different frontend/backend representations

## Completed Enhancements (October 2025)

### Security ✅
- [x] Implemented BCrypt password hashing (work factor 12)
- [x] JWT authentication middleware configured
- [x] Role-based authorization with AdminOnly policy
- [x] Password validation (minimum 8 characters)

### Features ✅
- [x] Transaction tracking with budget vs. actual analysis
- [x] Module progress tracking (database-backed)
- [x] Goal progress tracking and projections
- [x] Financial insights and recommendations engine
- [x] Export reports (CSV, JSON)
- [x] 12-month budget projections
- [x] Debt avalanche method
- [x] COLA-adjusted guardrails
- [x] Financial health score calculator

### Future Enhancements

### Technical
- [ ] Unit tests for repositories
- [ ] Integration tests for controllers
- [ ] API versioning
- [ ] Caching layer (Redis)
- [ ] Logging framework (Serilog)
- [ ] Health checks endpoint
- [ ] API rate limiting

## Contributing

### Code Style
- Follow SOLID principles
- Write XML documentation comments
- Use meaningful variable names
- Keep methods small and focused
- Prefer composition over inheritance

### Adding New Features
1. Create model in `Models/`
2. Update `schema.sql` with new table
3. Create repository interface and implementation
4. Register in `Program.cs` DI container
5. Create DTOs for API responses
6. Add controller endpoints
7. Update this README

## License
Internal academic project - MIS-321 Group Project

