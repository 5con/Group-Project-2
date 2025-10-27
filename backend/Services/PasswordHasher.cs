using BCrypt.Net;

namespace backend.Services;

/// <summary>
/// Utility service for password hashing using BCrypt.
/// Follows Single Responsibility Principle - handles only password security.
/// </summary>
public static class PasswordHasher
{
    /// <summary>
    /// Hashes a plaintext password using BCrypt.
    /// </summary>
    /// <param name="password">The plaintext password to hash</param>
    /// <returns>BCrypt hashed password</returns>
    public static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
    }

    /// <summary>
    /// Verifies a plaintext password against a BCrypt hash.
    /// </summary>
    /// <param name="password">The plaintext password to verify</param>
    /// <param name="hash">The BCrypt hash to verify against</param>
    /// <returns>True if password matches hash, false otherwise</returns>
    public static bool VerifyPassword(string password, string hash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch
        {
            return false;
        }
    }
}

