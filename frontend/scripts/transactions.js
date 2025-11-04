// Transaction Management Module

class TransactionManager {
    constructor(financialApp) {
        this.financialApp = financialApp;
        this.transactions = [];
        this.categories = [];
    }

    /**
     * Initialize transaction system
     */
    async init() {
        await this.loadCategories();
        this.setupEventListeners();
    }

    /**
     * Load categories for transaction categorization
     */
    async loadCategories() {
        try {
            const referenceData = await apiManager.loadReferenceData();
            this.categories = referenceData.categories || [];
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const addTransactionBtn = document.getElementById('add-transaction-btn');
        if (addTransactionBtn) {
            addTransactionBtn.addEventListener('click', () => this.showAddTransactionModal());
        }

        const saveTransactionBtn = document.getElementById('save-transaction-btn');
        if (saveTransactionBtn) {
            saveTransactionBtn.addEventListener('click', () => this.saveTransaction());
        }

        const exportTransactionsBtn = document.getElementById('export-transactions-btn');
        if (exportTransactionsBtn) {
            exportTransactionsBtn.addEventListener('click', () => this.exportTransactions());
        }
    }

    /**
     * Show add transaction modal
     */
    showAddTransactionModal() {
        const modalHtml = `
            <div class="modal fade" id="addTransactionModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add Transaction</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="transaction-form">
                                <div class="mb-3">
                                    <label for="transaction-date" class="form-label">Date</label>
                                    <input type="date" class="form-control" id="transaction-date" 
                                           value="${new Date().toISOString().split('T')[0]}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="transaction-category" class="form-label">Category</label>
                                    <select class="form-select" id="transaction-category" required>
                                        <option value="">Select a category...</option>
                                        ${this.categories.map(cat => `
                                            <option value="${cat.id}">${cat.name}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="transaction-amount" class="form-label">Amount</label>
                                    <input type="number" class="form-control" id="transaction-amount" 
                                           step="0.01" min="0" placeholder="0.00" required>
                                </div>
                                <div class="mb-3">
                                    <label for="transaction-note" class="form-label">Note (optional)</label>
                                    <textarea class="form-control" id="transaction-note" rows="2"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="save-transaction-btn">Save Transaction</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('addTransactionModal');
        if (existingModal) existingModal.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
        modal.show();

        // Re-attach save button listener
        document.getElementById('save-transaction-btn').addEventListener('click', () => this.saveTransaction());
    }

    /**
     * Save transaction
     */
    async saveTransaction() {
        const date = document.getElementById('transaction-date').value;
        const categoryId = parseInt(document.getElementById('transaction-category').value);
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const note = document.getElementById('transaction-note').value;

        if (!date || !categoryId || !amount) {
            uiManager.showErrorAlert('Please fill in all required fields');
            return;
        }

        try {
            const transactionData = {
                householdId: this.financialApp.currentHouseholdId,
                date,
                categoryId,
                amount,
                note: note || ''
            };

            await apiManager.addTransaction(transactionData);
            uiManager.showSuccessAlert('Transaction added successfully');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
            modal.hide();

            // Reload transactions
            await this.loadTransactions();
        } catch (error) {
            console.error('Error saving transaction:', error);
            uiManager.showErrorAlert('Failed to save transaction');
        }
    }

    /**
     * Load transactions for current household
     */
    async loadTransactions(startDate = null, endDate = null) {
        if (!this.financialApp.currentHouseholdId) return;

        try {
            this.transactions = await apiManager.loadTransactions(
                this.financialApp.currentHouseholdId,
                startDate,
                endDate
            );
            this.displayTransactions();
            this.displayBudgetVsActual();
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    /**
     * Display transactions list
     */
    displayTransactions() {
        const container = document.getElementById('transactions-list');
        if (!container) return;

        if (!this.transactions || this.transactions.length === 0) {
            container.innerHTML = '<p class="text-muted">No transactions yet. Add your first transaction above.</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.transactions.map(txn => `
                            <tr>
                                <td>${new Date(txn.date).toLocaleDateString()}</td>
                                <td>${txn.categoryName || 'Unknown'}</td>
                                <td>${this.formatCurrency(txn.amount)}</td>
                                <td>${txn.note || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Display budget vs actual spending comparison
     */
    displayBudgetVsActual() {
        const container = document.getElementById('budget-vs-actual');
        if (!container || !this.financialApp.currentBudget) return;

        // Calculate actual spending by category
        const actualByCategory = {};
        this.transactions.forEach(txn => {
            if (!actualByCategory[txn.categoryId]) {
                actualByCategory[txn.categoryId] = 0;
            }
            actualByCategory[txn.categoryId] += txn.amount;
        });

        // Compare with budget
        const budgetItems = this.financialApp.currentBudget.budgetItems || [];
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0"><i class="bi bi-graph-up me-2"></i>Budget vs Actual</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Budgeted</th>
                                    <th>Actual</th>
                                    <th>Remaining</th>
                                    <th>Progress</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${budgetItems.map(item => {
                                    const actual = actualByCategory[item.categoryId] || 0;
                                    const remaining = item.plannedAmount - actual;
                                    const percentage = (actual / item.plannedAmount) * 100;
                                    const status = percentage > 100 ? 'danger' : percentage > 90 ? 'warning' : 'success';

                                    return `
                                        <tr>
                                            <td>${item.category?.name || 'Unknown'}</td>
                                            <td>${this.formatCurrency(item.plannedAmount)}</td>
                                            <td>${this.formatCurrency(actual)}</td>
                                            <td class="text-${remaining >= 0 ? 'success' : 'danger'}">
                                                ${this.formatCurrency(remaining)}
                                            </td>
                                            <td>
                                                <div class="progress" style="height: 20px;">
                                                    <div class="progress-bar bg-${status}" 
                                                         style="width: ${Math.min(percentage, 100)}%"
                                                         role="progressbar">
                                                        ${percentage.toFixed(0)}%
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Export transactions to CSV
     */
    async exportTransactions(format = 'csv') {
        if (!this.financialApp.currentHouseholdId) {
            uiManager.showErrorAlert('No household selected');
            return;
        }

        try {
            await apiManager.exportTransactions(
                this.financialApp.currentHouseholdId,
                format
            );
            uiManager.showSuccessAlert(`Transactions exported successfully as ${format.toUpperCase()}`);
        } catch (error) {
            console.error('Error exporting transactions:', error);
            uiManager.showErrorAlert('Failed to export transactions');
        }
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.TransactionManager = TransactionManager;
}

