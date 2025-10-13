// API Module

class ApiManager {
    constructor() {
        this.baseUrl = 'http://localhost:5267/api';
    }

    async loadReferenceData() {
        try {
            console.log('Loading reference data from:', this.baseUrl);

            // Load states from backend
            console.log('Fetching states...');
            const statesUrl = `${this.baseUrl}/ReferenceData/states`;
            console.log('States URL:', statesUrl);

            const statesResponse = await fetch(statesUrl);

            if (!statesResponse.ok) {
                const errorText = await statesResponse.text();
                console.error('States API error response:', errorText);
                throw new Error(`States API error: ${statesResponse.status} ${statesResponse.statusText} - ${errorText}`);
            }

            const states = await statesResponse.json();
            console.log(`Loaded ${states?.length || 0} states:`, states);

            // Load categories from backend
            console.log('Fetching categories...');
            const categoriesUrl = `${this.baseUrl}/ReferenceData/categories`;
            console.log('Categories URL:', categoriesUrl);

            const categoriesResponse = await fetch(categoriesUrl);

            if (!categoriesResponse.ok) {
                const errorText = await categoriesResponse.text();
                console.error('Categories API error response:', errorText);
                throw new Error(`Categories API error: ${categoriesResponse.status} ${categoriesResponse.statusText} - ${errorText}`);
            }

            const categories = await categoriesResponse.json();
            console.log(`Loaded ${categories?.length || 0} categories:`, categories);

            return { states, categories };
        } catch (error) {
            console.error('ERROR loading reference data:', error);

            if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to server. Please ensure the backend server is running on port 5267. Run the start.ps1 script to start both servers.');
            }

            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                baseUrl: this.baseUrl
            });
            throw error;
        }
    }

    async checkFirstTimeUser(email) {
        try {
            if (!email) {
                throw new Error('Email is required');
            }

            console.log('Checking first-time user status for:', email);

            // Check if user has a household (indicates they've completed onboarding)
            const response = await fetch(`${this.baseUrl}/onboarding/household/by-email/${encodeURIComponent(email)}`);
            console.log('Response status:', response.status);

            if (response.ok) {
                const householdData = await response.json();
                console.log('Household data found:', householdData);

                if (householdData && householdData.householdId) {
                    // User has completed onboarding, return household data
                    return { isFirstTime: false, householdId: householdData.householdId };
                } else {
                    throw new Error('Invalid household data received');
                }
            } else if (response.status === 404) {
                console.log('No household found - first-time user');
                // User doesn't have a household yet, so they're first-time
                return { isFirstTime: true, householdId: null };
            } else {
                const errorText = await response.text();
                throw new Error(`Server error (${response.status}): ${errorText}`);
            }
        } catch (error) {
            console.error('ERROR checking first-time user:', error);

            if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to server. Please ensure the backend server is running on port 5267. Run the start.ps1 script to start both servers.');
            }

            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                email: email,
                baseUrl: this.baseUrl
            });
            // Default to first-time on error
            return { isFirstTime: true, householdId: null };
        }
    }

    async submitOnboarding(formData) {
        try {
            if (!formData) {
                throw new Error('Form data is required');
            }

            console.log('Submitting onboarding data...');
            const response = await fetch(`${this.baseUrl}/onboarding`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Onboarding submission successful:', result);
                return result;
            } else {
                let errorText = 'Unknown error';
                try {
                    errorText = await response.text();
                } catch (e) {
                    console.warn('Could not read error response text');
                }
                throw new Error(`Error creating profile (${response.status}): ${errorText}`);
            }
        } catch (error) {
            console.error('ERROR submitting onboarding:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                formData: formData
            });
            throw error;
        }
    }

    async loadHouseholdData(householdId) {
        try {
            const response = await fetch(`${this.baseUrl}/onboarding/household/${householdId}`);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to load household data');
            }
        } catch (error) {
            console.error('Error loading household data:', error);
            throw error;
        }
    }

    async loadBudgetData(householdId, month) {
        try {
            const response = await fetch(`${this.baseUrl}/budget/household/${householdId}?month=${month}`);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to load budget data');
            }
        } catch (error) {
            console.error('Error loading budget data:', error);
            throw error;
        }
    }

    async createBudget(budgetData) {
        try {
            const response = await fetch(`${this.baseUrl}/budget/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(budgetData)
            });

            if (response.ok) {
                return await response.json();
            } else {
                const error = await response.text();
                throw new Error(`Error creating budget: ${error}`);
            }
        } catch (error) {
            console.error('Error creating budget:', error);
            throw error;
        }
    }

    async loadFinancialModules() {
        try {
            const response = await fetch(`${this.baseUrl}/ReferenceData/financial-modules`);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to load financial modules');
            }
        } catch (error) {
            console.error('Error loading financial modules:', error);
            throw error;
        }
    }

    async updateModuleProgress(userId, moduleId, progress) {
        try {
            const response = await fetch(`${this.baseUrl}/ReferenceData/financial-modules/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    moduleId,
                    progressPercentage: progress,
                    isCompleted: progress >= 100
                })
            });

            if (response.ok) {
                return await response.json();
            } else {
                const error = await response.text();
                throw new Error(`Error updating progress: ${error}`);
            }
        } catch (error) {
            console.error('Error updating module progress:', error);
            throw error;
        }
    }

    async addTransaction(transactionData) {
        try {
            const response = await fetch(`${this.baseUrl}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });

            if (response.ok) {
                return await response.json();
            } else {
                const error = await response.text();
                throw new Error(`Error adding transaction: ${error}`);
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    async loadTransactions(householdId, startDate, endDate) {
        try {
            let url = `${this.baseUrl}/transactions/household/${householdId}`;
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to load transactions');
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            throw error;
        }
    }

    async generateReports(householdId, reportType, startDate, endDate) {
        try {
            let url = `${this.baseUrl}/reports/household/${householdId}?type=${reportType}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;

            const response = await fetch(url);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to generate reports');
            }
        } catch (error) {
            console.error('Error generating reports:', error);
            throw error;
        }
    }
}

// Create global API instance
const apiManager = new ApiManager();

// Expose the class globally for other modules
window.ApiManager = ApiManager;

// Add error handling and logging
console.log('ApiManager module loaded successfully');

// Expose API functions globally if needed
window.addTransactionAPI = (transactionData) => apiManager.addTransaction(transactionData);