using backend.Repositories;
using backend.Services;
using backend.Database;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Handle circular references by ignoring them (though we're using DTOs now)
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.MaxDepth = 64;
    });

// Configure CORS for development
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevAllowAll", policy =>
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// Get connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=financialapp.db";

// Register repositories using Dependency Injection (Dependency Inversion Principle)
builder.Services.AddSingleton<IDbConnectionFactory>(sp => new DbConnectionFactory(connectionString));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IHouseholdRepository, HouseholdRepository>();
builder.Services.AddScoped<IBudgetRepository, BudgetRepository>();
builder.Services.AddScoped<IReferenceDataRepository, ReferenceDataRepository>();
builder.Services.AddScoped<IAdminRepository, AdminRepository>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();
builder.Services.AddScoped<IGoalRepository, GoalRepository>();

// Register services (business logic layer)
builder.Services.AddScoped<IBudgetService, BudgetService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IExportService, ExportService>();
builder.Services.AddSingleton<JwtService>();

// Register database initializer
builder.Services.AddSingleton(sp => new DatabaseInitializer(connectionString));

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "FinancialAppAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "FinancialAppClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Enable CORS early in pipeline
app.UseCors("DevAllowAll");

// Convenience: respond OK to any preflight request in dev
app.MapMethods("{*any}", new[] { "OPTIONS" }, () => Results.Ok())
   .ExcludeFromDescription();

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var dbInitializer = scope.ServiceProvider.GetRequiredService<DatabaseInitializer>();

    try
    {
        Console.WriteLine("Starting database initialization...");
        // In development, recreate database to avoid schema drift
        var dropExisting = app.Environment.IsDevelopment();
        await dbInitializer.InitializeAsync(dropExisting);

        Console.WriteLine("Database initialized successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error initializing database: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        // Don't throw in production, just log and continue
        if (!app.Environment.IsDevelopment())
        {
            Console.WriteLine("Continuing without database initialization...");
        }
        else
        {
            throw;
        }
    }
}

app.MapControllers();

app.Run();
