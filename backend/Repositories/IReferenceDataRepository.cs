using backend.Models;

namespace backend.Repositories;

/// <summary>   
/// Repository interface for reference data (Categories, StateParams, FinancialModules).
/// </summary>
public interface IReferenceDataRepository
{
    // Category operations  
    Task<Category?> GetCategoryByIdAsync(int id);
    Task<IEnumerable<Category>> GetAllCategoriesAsync();

    // StateParam operations
    Task<StateParam?> GetStateParamAsync(string state);
    Task<IEnumerable<StateParam>> GetAllStateParamsAsync();

    // FinancialModule operations
    Task<FinancialModule?> GetFinancialModuleByIdAsync(int id);
    Task<IEnumerable<FinancialModule>> GetAllFinancialModulesAsync();

    // UserModuleProgress operations
    Task<UserModuleProgress?> GetUserModuleProgressAsync(int userId, int moduleId);
    Task<IEnumerable<UserModuleProgress>> GetAllUserProgressAsync(int userId);
    Task UpsertUserModuleProgressAsync(UserModuleProgress progress);
    Task DeleteUserModuleProgressAsync(int userId, int moduleId);
}

