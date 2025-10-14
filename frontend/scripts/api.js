// API Module

class ApiManager {
    constructor() {
        this.baseUrl = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'http://localhost:5267/api';
    }

    async loadReferenceData() {
        try {
            console.log('Loading reference data from:', this.baseUrl);

            // Load states from backend
            console.log('Fetching states...');
            const statesUrl = `${this.baseUrl}/ReferenceData/states`;
            console.log('States URL:', statesUrl);

            const statesResponse = await fetch(statesUrl, {
                mode: 'cors',
                credentials: 'omit'
            });

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

            const categoriesResponse = await fetch(categoriesUrl, {
                mode: 'cors',
                credentials: 'omit'
            });

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

    async submitOnboarding(formData) {
        try {
            if (!formData) {
                throw new Error('Form data is required');
            }

            console.log('Submitting onboarding data...');
            console.log('FormData being sent:', JSON.stringify(formData, null, 2));

            const url = `${this.baseUrl}/onboarding`;
            console.log('Making request to:', url);

            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                const result = await response.json();
                console.log('Onboarding submission successful:', result);
                return result;
            } else {
                let errorText = 'Unknown error';
                try {
                    errorText = await response.text();
                    console.log('Error response text:', errorText);
                } catch (e) {
                    console.warn('Could not read error response text');
                }
                console.log('Full response object:', response);
                throw new Error(`Error creating profile (${response.status}): ${errorText}`);
            }
        } catch (error) {
            console.error('ERROR submitting onboarding:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                formData: formData,
                baseUrl: this.baseUrl
            });
            throw error;
        }
    }

    async loadHouseholdData(householdId) {
        try {
            const response = await fetch(`${this.baseUrl}/onboarding/household/${householdId}`, {
                mode: 'cors',
                credentials: 'omit'
            });
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
            const response = await fetch(`${this.baseUrl}/budget/household/${householdId}?month=${month}`, {
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Budget data response:', data);
                return data;
            } else if (response.status === 404) {
                // Budget not found is normal for new users
                console.log('No budget found for household (this is normal for new users)');
                return null;
            } else {
                const errorText = await response.text();
                throw new Error(`Failed to load budget data: ${response.status} ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('Error loading budget data:', error);
            
            // Don't throw for common "no budget" scenarios - let calling code handle gracefully
            if (error.message.includes('404') || error.message.includes('not found') || 
                error.message.includes('abort') || error.name === 'AbortError') {
                console.log('Budget data not found - this is expected for new users');
                return null;
            }
            
            throw error;
        }
    }

    async createBudget(budgetData) {
        try {
            console.log('Creating budget with data:', budgetData);
            const response = await fetch(`${this.baseUrl}/budget/generate`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(budgetData)
            });

            console.log('Budget creation response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Budget creation successful:', result);
                return result;
            } else {
                const errorText = await response.text();
                console.error('Budget creation failed:', response.status, errorText);
                
                let errorMessage = `Error creating budget: ${errorText}`;
                if (response.status === 400) {
                    errorMessage = 'Invalid budget data. Please check your input and try again.';
                } else if (response.status === 404) {
                    errorMessage = 'Household not found. Please refresh the page and try again.';
                } else if (response.status === 500) {
                    errorMessage = 'Server error creating budget. Please try again in a moment.';
                }
                
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error creating budget:', error);
            
            // Improve error messages for common issues
            if (error.message.includes('fetch') || error.message.includes('network')) {
                throw new Error('Connection error. Please check if the server is running and try again.');
            } else if (error.message.includes('JSON')) {
                throw new Error('Invalid response from server. Please try again.');
            }
            
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

    async updateHousehold(householdId, updateData) {
        try {
            const response = await fetch(`${this.baseUrl}/onboarding/household/${householdId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to update household: ${error}`);
            }

            const result = await response.json();
            console.log('Household updated successfully:', result);
            return result;
        } catch (error) {
            console.error('Error updating household:', error);
            throw error;
        }
    }
}

// Create global API instance if it doesn't exist
if (typeof window.apiManager === 'undefined') {
    window.apiManager = new ApiManager();
}

// Expose the class globally for other modules if it doesn't exist
if (typeof window.ApiManager === 'undefined') {
    window.ApiManager = ApiManager;
}

// Add error handling and logging
console.log('ApiManager module loaded successfully');

// Expose API functions globally if needed
if (typeof window.addTransactionAPI === 'undefined') {
    window.addTransactionAPI = (transactionData) => window.apiManager.addTransaction(transactionData);
}