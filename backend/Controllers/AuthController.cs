using Microsoft.AspNetCore.Mvc;
using backend.Models;
using backend.Repositories;
using backend.Services;
using backend.DTOs;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace backend.Controllers;

/// <summary>
/// Controller for user authentication operations.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IHouseholdRepository _householdRepository;
    private readonly JwtService _jwtService;

    public AuthController(
        IUserRepository userRepository,
        IHouseholdRepository householdRepository,
        JwtService jwtService)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _householdRepository = householdRepository ?? throw new ArgumentNullException(nameof(householdRepository));
        _jwtService = jwtService ?? throw new ArgumentNullException(nameof(jwtService));
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class AuthResponse
    {
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public int? CurrentHouseholdId { get; set; }
        public bool IsAdmin { get; set; }
        public bool HasCompletedOnboarding { get; set; }
    }

    /// <summary>
    /// Authenticates a user and returns a JWT token.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email and password are required");
            }

            // Normalize email
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            // Find user
            var user = await _userRepository.GetByEmailAsync(normalizedEmail);
            if (user == null)
            {
                // User doesn't exist - create new user automatically
                Console.WriteLine($"Creating new user account for email: {normalizedEmail}");

                user = new User
                {
                    Email = normalizedEmail,
                    PasswordHash = PasswordHasher.HashPassword(request.Password),
                    IsAdmin = false, // New users are not admins by default
                    Locale = "en-US",
                    CurrentHouseholdId = null,
                    CreatedAt = DateTime.UtcNow
                };

                // Ensure password hash is not null or empty
                if (string.IsNullOrEmpty(user.PasswordHash))
                {
                    Console.WriteLine($"Error: Password hash is empty for email {normalizedEmail}");
                    return StatusCode(500, "Failed to hash password");
                }

                // Save new user to database
                try
                {
                    var newUserId = await _userRepository.CreateAsync(user);
                    user.Id = newUserId;

                    Console.WriteLine($"New user created successfully with ID: {newUserId} for email: {normalizedEmail}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error creating user {normalizedEmail}: {ex.Message}");
                    Console.WriteLine($"Stack trace: {ex.StackTrace}");
                    return StatusCode(500, $"Failed to create user account: {ex.Message}");
                }
            }
            else
            {
                // User exists - verify password
                if (!PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
                {
                    return Unauthorized("Invalid email or password");
                }
            }

            // Generate token
            var token = _jwtService.GenerateToken(user.Id, user.Email, user.IsAdmin);

            // Get current household if exists
            int? currentHouseholdId = null;
            if (user.CurrentHouseholdId.HasValue)
            {
                var household = await _householdRepository.GetByIdAsync(user.CurrentHouseholdId.Value);
                if (household != null)
                {
                    currentHouseholdId = household.Id;
                }
            }

            var response = new AuthResponse
            {
                UserId = user.Id,
                Email = user.Email,
                Token = token,
                CurrentHouseholdId = currentHouseholdId,
                IsAdmin = user.IsAdmin,
                HasCompletedOnboarding = user.HasCompletedOnboarding
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Login error: {ex.Message}");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Registers a new user account.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email and password are required");
            }

            if (request.Password.Length < 6)
            {
                return BadRequest("Password must be at least 6 characters long");
            }

            // Normalize email
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            // Check if user already exists
            var existingUser = await _userRepository.GetByEmailAsync(normalizedEmail);
            if (existingUser != null)
            {
                return BadRequest("User with this email already exists");
            }

            // Create new user
            var user = new User
            {
                Email = normalizedEmail,
                PasswordHash = PasswordHasher.HashPassword(request.Password),
                IsAdmin = false,
                Locale = "en-US",
                CurrentHouseholdId = null,
                CreatedAt = DateTime.UtcNow
            };

            // Save to database
            var newUserId = await _userRepository.CreateAsync(user);

            // Generate token for immediate login
            var token = _jwtService.GenerateToken(newUserId, normalizedEmail, false);

            var response = new AuthResponse
            {
                UserId = newUserId,
                Email = normalizedEmail,
                Token = token,
                CurrentHouseholdId = null,
                IsAdmin = false,
                HasCompletedOnboarding = false
            };

            Console.WriteLine($"New user registered successfully: {normalizedEmail} (ID: {newUserId})");
            return CreatedAtAction(nameof(Login), new { email = normalizedEmail }, response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Registration error: {ex.Message}");
            return StatusCode(500, "Internal server error");
        }
    }


    /// <summary>
    /// Validates a JWT token and returns user information.
    /// </summary>
    [HttpPost("validate")]
    public async Task<IActionResult> ValidateToken([FromBody] TokenRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Token))
            {
                return BadRequest("Token is required");
            }

            var principal = _jwtService.ValidateToken(request.Token);
            if (principal == null)
            {
                return Unauthorized("Invalid token");
            }

            // Extract user ID from token
            var userIdClaim = principal.FindFirst("UserId") ?? principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                return Unauthorized("Invalid token");
            }

            // Get user details
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return Unauthorized("User not found");
            }

            // Get current household if exists
            int? currentHouseholdId = null;
            if (user.CurrentHouseholdId.HasValue)
            {
                var household = await _householdRepository.GetByIdAsync(user.CurrentHouseholdId.Value);
                if (household != null)
                {
                    currentHouseholdId = household.Id;
                }
            }

            var response = new AuthResponse
            {
                UserId = user.Id,
                Email = user.Email,
                Token = request.Token, // Return the same token
                CurrentHouseholdId = currentHouseholdId,
                IsAdmin = user.IsAdmin,
                HasCompletedOnboarding = user.HasCompletedOnboarding
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Token validation error: {ex.Message}");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Updates a user's current household.
    /// </summary>
    [HttpPut("current-household")]
    public async Task<IActionResult> UpdateCurrentHousehold([FromBody] UpdateCurrentHouseholdRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Token))
            {
                return BadRequest("Token is required");
            }

            var principal = _jwtService.ValidateToken(request.Token);
            if (principal == null)
            {
                return Unauthorized("Invalid token");
            }

            // Extract user ID from token
            var userIdClaim = principal.FindFirst("UserId") ?? principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                return Unauthorized("Invalid token");
            }

            // Update user's current household
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            user.CurrentHouseholdId = request.HouseholdId;
            await _userRepository.UpdateAsync(user);

            return Ok(new { Message = "Current household updated successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Update current household error: {ex.Message}");
            return StatusCode(500, "Internal server error");
        }
    }

    public class TokenRequest
    {
        public string Token { get; set; } = string.Empty;
    }

    public class UpdateCurrentHouseholdRequest
    {
        public string Token { get; set; } = string.Empty;
        public int? HouseholdId { get; set; }
    }

}
