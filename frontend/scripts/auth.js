// Authentication Module

class AuthManager {
    constructor() {
        this.authToken = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.isDeveloperMode = false;
    }

    async checkAuthentication() {
        // Always start fresh - don't restore login state
        // This ensures users must login every time they open the app
        console.log('Authentication check completed - user must login fresh');
    }

    setupAuthHeaders() {
        if (this.authToken && !this.originalFetch) {
            // Store original fetch for API calls that need auth (only once)
            this.originalFetch = window.fetch;
            window.fetch = async (url, options = {}) => {
                if (url.startsWith('http://localhost:5267/api/')) {
                    options.headers = {
                        ...options.headers,
                        'Authorization': `Bearer ${this.authToken}`,
                        'Content-Type': 'application/json'
                    };
                }
                return this.originalFetch.call(window, url, options);
            };
        }
    }

    async handleLogin(email, password) {
        if (!email || !password) {
            throw new Error('Please enter both email and password');
        }

        try {
            const response = await fetch('http://localhost:5267/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                this.authToken = data.token;
                this.currentUser = { email: data.email, userId: data.userId };
                this.isAuthenticated = true;
                this.isDeveloperMode = false;

                // Store auth data
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('userEmail', email);
                if (typeof data.userId !== 'undefined') {
                    localStorage.setItem('userId', String(data.userId));
                }
                localStorage.setItem('isDeveloperMode', 'false');

                // Ensure future API calls include auth
                this.setupAuthHeaders();

                return true;
            } else {
                const error = await response.text();
                throw new Error('Login failed: ' + error);
            }
        } catch (error) {
            if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to server. Please ensure the backend server is running on port 5267. Run the start.ps1 script to start both servers.');
            }
            throw new Error('Login failed: ' + error.message);
        }
    }

    async handleDeveloperLogin(password) {
        if (password !== '123!') {
            throw new Error('Invalid developer password');
        }

        // Developer login successful
        this.authToken = 'developer-token';
        this.currentUser = { email: 'developer@test.com', userId: 0 };
        this.isAuthenticated = true;
        this.isDeveloperMode = true;

        // Store auth data
        localStorage.setItem('authToken', this.authToken);
        localStorage.setItem('userEmail', 'developer@test.com');
        localStorage.setItem('userId', '0');
        localStorage.setItem('isDeveloperMode', 'true');

        // Setup headers for consistency
        this.setupAuthHeaders();

        return true;
    }

    logout() {
        // Clear authentication data
        this.authToken = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.isDeveloperMode = false;

        // Clear local storage completely
        localStorage.clear();
        sessionStorage.clear();

        // Reset auth headers
        if (this.originalFetch) {
            window.fetch = this.originalFetch;
            this.originalFetch = null;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }

    isInDeveloperMode() {
        return this.isDeveloperMode;
    }
}

// Create global auth instance
const authManager = new AuthManager();

// Expose the class globally for other modules
window.AuthManager = AuthManager;

// Add error handling and logging
console.log('AuthManager module loaded successfully');