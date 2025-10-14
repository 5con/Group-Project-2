using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Handle circular references by ignoring them
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.MaxDepth = 64; // Increase max depth to handle complex objects
    });

// Configure CORS for development to allow all origins (no credentials)
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevAllowAll", policy =>
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"))
           .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.MultipleCollectionIncludeWarning)));


// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// app.UseHttpsRedirection(); // Disabled for development

// Enable CORS early in pipeline
app.UseCors("DevAllowAll");

// Convenience: respond OK to any preflight request in dev
app.MapMethods("{*any}", new[] { "OPTIONS" }, () => Results.Ok())
   .ExcludeFromDescription();

// Ensure database is created and seeded
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // In development we'll recreate the database to avoid migration/schema drift during local runs.
    // This intentionally drops the database in Development only; do NOT enable in production.
    if (app.Environment.IsDevelopment())
    {
        db.Database.EnsureDeleted();
    }

    db.Database.Migrate();

    // Seed initial data
    var seeder = new DatabaseSeeder(db);
    seeder.Seed();
}

app.MapControllers();

app.Run();
