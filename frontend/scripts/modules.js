// Financial Literacy Modules Manager
class ModulesManager {
    constructor() {
        this.modules = [];
        this.currentModule = null;
        this.completedModules = new Set();
        // Load completed modules in init() now since it's async
    }

    // Load completed modules from API
    async loadCompletedModules() {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const progress = await window.apiManager.getModulesWithProgress(userId);
            if (progress && Array.isArray(progress)) {
                this.completedModules = new Set(
                    progress.filter(m => m.isCompleted).map(m => m.moduleId)
                );
            }
        } catch (error) {
            console.error('Error loading module progress from API:', error);
            // Fallback to localStorage
            const completed = localStorage.getItem('completedModules');
            if (completed) {
                this.completedModules = new Set(JSON.parse(completed));
            }
        }
    }

    // Save completed modules to API
    async saveCompletedModules() {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                // Fallback to localStorage if no userId
                localStorage.setItem('completedModules', JSON.stringify([...this.completedModules]));
                return;
            }

            // Save to API for each completed module
            for (const moduleId of this.completedModules) {
                await window.apiManager.updateModuleProgress(userId, moduleId, 100);
            }
            
            // Also save to localStorage as backup
            localStorage.setItem('completedModules', JSON.stringify([...this.completedModules]));
        } catch (error) {
            console.error('Error saving module progress to API:', error);
            // Fallback to localStorage only
            localStorage.setItem('completedModules', JSON.stringify([...this.completedModules]));
        }
    }

    // Initialize the modules system
    async init() {
        await this.loadCompletedModules();
        await this.loadModulesData();
        this.setupEventListeners();
        this.displayModulesGrid();
    }

    // Load comprehensive modules data with accurate financial information
    loadModulesData() {
        this.modules = [
            {
                id: 1,
                title: "Budgeting",
                icon: "bi-calculator",
                color: "primary",
                description: "Master the fundamentals of tracking income and expenses to create a sustainable financial plan.",
                content: `
                    <h4>Foundations of Financial Planning</h4>
                    <p>Budgeting is the cornerstone of financial success. According to the National Foundation for Credit Counseling, 64% of Americans don't have a budget, which often leads to financial stress and debt accumulation.</p>

                    <h5>Why Budgeting Matters</h5>
                    <ul>
                        <li><strong>Financial Control:</strong> A budget gives you complete visibility into where your money goes</li>
                        <li><strong>Goal Achievement:</strong> Helps prioritize spending toward important financial goals</li>
                        <li><strong>Debt Prevention:</strong> Prevents overspending that leads to high-interest debt</li>
                        <li><strong>Emergency Preparedness:</strong> Builds financial resilience for unexpected expenses</li>
                    </ul>

                    <h5>Popular Budgeting Methods</h5>
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>50/30/20 Rule</h6>
                                    <p class="text-muted">Simple percentage-based approach popularized by Senator Elizabeth Warren.</p>
                                    <ul class="small">
                                        <li>50% - Needs (rent, food, utilities)</li>
                                        <li>30% - Wants (entertainment, dining out)</li>
                                        <li>20% - Savings & Debt Repayment</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Zero-Based Budget</h6>
                                    <p class="text-muted">Every dollar is assigned a purpose before the month begins.</p>
                                    <ul class="small">
                                        <li>Income - Expenses = Zero</li>
                                        <li>Requires detailed planning</li>
                                        <li>Maximizes every dollar's potential</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Envelope System</h6>
                                    <p class="text-muted">Cash-based system using physical envelopes for each category.</p>
                                    <ul class="small">
                                        <li>Physical cash limits</li>
                                        <li>Tactile spending awareness</li>
                                        <li>Works well for variable expenses</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                topics: [
                    "Budget methods (50/30/20, Zero-Based, Envelope)",
                    "Variable vs. fixed costs identification",
                    "Sinking funds for irregular expenses",
                    "Seasonal spending patterns",
                    "Budget tracking tools and apps",
                    "Troubleshooting budget shortfalls"
                ],
                takeaways: [
                    "Create a working monthly budget using your chosen method",
                    "Implement a simple tracking system with 3-5 cost reduction opportunities",
                    "Establish sinking funds for irregular expenses like car maintenance or holidays"
                ]
            },
            {
                id: 2,
                title: "Banking & Cash Management",
                icon: "bi-bank",
                color: "success",
                description: "Optimize your banking relationships to minimize fees, maximize yield, and ensure secure money management.",
                content: `
                    <h4>Understanding Banking Products</h4>
                    <p>The average American pays $329 annually in banking fees, according to a 2023 Bankrate study. Choosing the right accounts can save hundreds of dollars per year.</p>

                    <h5>Account Types and Optimization</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Checking Accounts</h6>
                                    <p>For everyday transactions and bill payments.</p>
                                    <h6 class="text-success">Key Features to Look For:</h6>
                                    <ul class="small">
                                        <li>No monthly maintenance fees</li>
                                        <li>Free ATM network access</li>
                                        <li>Mobile check deposit</li>
                                        <li>Bill pay services</li>
                                        <li>Overdraft protection options</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Savings Accounts</h6>
                                    <p>For emergency funds and short-term savings goals.</p>
                                    <h6 class="text-success">Optimization Tips:</h6>
                                    <ul class="small">
                                        <li>High-yield accounts (4-5% APY)</li>
                                        <li>FDIC insurance up to $250,000</li>
                                        <li>Easy online transfers</li>
                                        <li>Limited monthly withdrawals (Regulation D)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Advanced Banking Products</h5>
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Certificates of Deposit (CDs)</h6>
                                    <p>Higher interest rates for locked funds.</p>
                                    <ul class="small">
                                        <li>Terms: 3 months to 5 years</li>
                                        <li>Rates: 4.5-5.5% (as of 2024)</li>
                                        <li>Early withdrawal penalties</li>
                                        <li>FDIC insured</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Money Market Accounts</h6>
                                    <p>Combines checking and savings features.</p>
                                    <ul class="small">
                                        <li>Higher interest than savings</li>
                                        <li>Limited check writing</li>
                                        <li>Debit card access</li>
                                        <li>Higher minimum balances</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Cash Management Accounts</h6>
                                    <p>Offered by investment firms, combining multiple services.</p>
                                    <ul class="small">
                                        <li>High interest rates</li>
                                        <li>Investment options</li>
                                        <li>ATM fee reimbursement</li>
                                        <li>Check writing</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                topics: [
                    "Checking vs. savings account optimization",
                    "High-yield savings accounts and current rates",
                    "Certificates of Deposit (CDs) and Money Market accounts",
                    "ACH transfers, wires, and Zelle payment systems",
                    "Overdraft protection and fee avoidance",
                    "Account security and fraud prevention"
                ],
                takeaways: [
                    "Create a banking optimization checklist for current accounts",
                    "Set up automated bill payments and savings transfers",
                    "Establish a system to minimize banking fees and maximize interest earned"
                ]
            },
            {
                id: 3,
                title: "Credit & Debt Management",
                icon: "bi-credit-card",
                color: "warning",
                description: "Build healthy credit habits while strategically eliminating costly debt to improve your financial position.",
                content: `
                    <h4>Understanding Credit and Debt Dynamics</h4>
                    <p>The average American household carries $6,194 in credit card debt (Federal Reserve, 2023). Understanding how credit works is crucial for financial health.</p>

                    <h5>Credit Scores and Reports</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>How Credit Scores Are Calculated</h6>
                                    <p>FICO Score components (MyFICO.com):</p>
                                    <ul class="small">
                                        <li><strong>35%</strong> - Payment History</li>
                                        <li><strong>30%</strong> - Amounts Owed</li>
                                        <li><strong>15%</strong> - Length of Credit History</li>
                                        <li><strong>10%</strong> - New Credit</li>
                                        <li><strong>10%</strong> - Credit Mix</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Credit Score Ranges</h6>
                                    <p>Understanding your score's implications:</p>
                                    <ul class="small">
                                        <li><strong>800+</strong> - Excellent (best rates)</li>
                                        <li><strong>740-799</strong> - Very Good</li>
                                        <li><strong>670-739</strong> - Good</li>
                                        <li><strong>580-669</strong> - Fair</li>
                                        <li><strong>Below 580</strong> - Poor</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Debt Payoff Strategies</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Debt Avalanche Method</h6>
                                    <p>Mathematically optimal approach focusing on interest savings.</p>
                                    <ol class="small">
                                        <li>List debts by interest rate (highest first)</li>
                                        <li>Pay minimums on all debts</li>
                                        <li>Put extra payments toward highest rate debt</li>
                                        <li>Repeat until all debts are paid</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Debt Snowball Method</h6>
                                    <p>Psychological approach building momentum through small wins.</p>
                                    <ol class="small">
                                        <li>List debts by balance (smallest first)</li>
                                        <li>Pay minimums on all debts</li>
                                        <li>Put extra payments toward smallest debt</li>
                                        <li>Celebrate each paid-off debt</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Strategic Debt Management</h5>
                    <div class="alert alert-info">
                        <h6><i class="bi bi-lightbulb"></i> Pro Tip: Balance Transfer Strategy</h6>
                        <p>Transfer high-interest credit card debt to cards offering 0% APR introductory periods (typically 12-21 months). This can save hundreds in interest while you pay down the balance.</p>
                    </div>
                `,
                topics: [
                    "Credit scores and credit report analysis",
                    "Credit utilization ratios and impact",
                    "Interest compounding and debt cost calculation",
                    "Types of loans (auto, student, personal, mortgage)",
                    "Debt payoff strategies (avalanche vs. snowball)",
                    "Balance transfer cards and 0% APR offers"
                ],
                takeaways: [
                    "Pull and analyze your credit report with an action plan",
                    "Choose and implement a debt payoff strategy",
                    "Establish rules for responsible credit card usage"
                ]
            },
            {
                id: 4,
                title: "Saving & Emergency Funds",
                icon: "bi-piggy-bank",
                color: "info",
                description: "Build financial security through strategic saving habits and emergency fund establishment.",
                content: `
                    <h4>The Psychology and Practice of Saving</h4>
                    <p>Only 44% of Americans have enough savings to cover a $1,000 emergency expense (Bankrate, 2023). Building saving habits is crucial for financial security.</p>

                    <h5>Emergency Fund Fundamentals</h5>
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h5 class="text-success">Starter Fund</h5>
                                    <h3>$1,000</h3>
                                    <p class="small">Cover minor emergencies and build confidence</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h5 class="text-primary">Basic Security</h5>
                                    <h3>3 Months</h3>
                                    <p class="small">Cover essential expenses for 3 months</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h5 class="text-warning">Full Security</h5>
                                    <h3>6 Months</h3>
                                    <p class="small">Complete financial independence from job loss</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Where to Keep Your Emergency Fund</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>High-Yield Savings Accounts</h6>
                                    <p>Best for most people due to accessibility and decent returns.</p>
                                    <ul class="small">
                                        <li>Current rates: 4-5% APY</li>
                                        <li>FDIC insured up to $250,000</li>
                                        <li>Same-day access to funds</li>
                                        <li>No market risk</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Money Market Funds</h6>
                                    <p>Higher potential returns with slightly less liquidity.</p>
                                    <ul class="small">
                                        <li>Current yields: 4.5-5.2%</li>
                                        <li>Not FDIC insured</li>
                                        <li>1-2 day settlement period</li>
                                        <li>Very low risk</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Advanced Saving Strategies</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Sinking Funds</h6>
                                    <p>Save for known future expenses to avoid debt.</p>
                                    <h6 class="text-success">Common Sinking Funds:</h6>
                                    <ul class="small">
                                        <li>Car maintenance/repairs</li>
                                        <li>Home maintenance</li>
                                        <li>Holiday spending</li>
                                        <li>Annual subscriptions</li>
                                        <li>Property taxes</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Automation Strategies</h6>
                                    <p>Set-it-and-forget-it saving methods.</p>
                                    <ul class="small">
                                        <li>Direct deposit splits</li>
                                        <li>Automatic transfers</li>
                                        <li>Round-up savings apps</li>
                                        <li>401(k) auto-escalation</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                topics: [
                    "Emergency fund sizing and calculation",
                    "Where to park cash for different time horizons",
                    "Short-term vs. mid-term savings goals",
                    "Sinking funds for irregular expenses",
                    "Automated saving strategies and tools"
                ],
                takeaways: [
                    "Calculate your target emergency fund amount based on expenses",
                    "Select appropriate accounts for different saving goals",
                    "Set up automated transfer schedules for consistent saving"
                ]
            },
            {
                id: 5,
                title: "Investing Fundamentals",
                icon: "bi-graph-up",
                color: "primary",
                description: "Learn the core principles of investing to grow your wealth over time through strategic asset allocation.",
                content: `
                    <h4>Why Investing Matters</h4>
                    <p>Historically, the stock market has returned about 7% annually after inflation (S&P 500, 1928-2023). Understanding investing fundamentals can help you build long-term wealth.</p>

                    <h5>Risk and Return Relationship</h5>
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h6 class="text-muted">Low Risk</h6>
                                    <h4 class="text-success">Low Return</h4>
                                    <p class="small">Savings accounts, CDs, Treasury bills</p>
                                    <p class="h5">1-3%</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h6 class="text-warning">Medium Risk</h6>
                                    <h4 class="text-warning">Medium Return</h4>
                                    <p class="small">Bonds, balanced funds</p>
                                    <p class="h5">4-6%</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h6 class="text-danger">High Risk</h6>
                                    <h4 class="text-danger">High Return</h4>
                                    <p class="small">Stocks, equity funds</p>
                                    <p class="h5">7-10%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Asset Classes Explained</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Stocks (Equities)</h6>
                                    <p>Ownership in companies with high growth potential but volatility.</p>
                                    <h6 class="text-success">Pros:</h6>
                                    <ul class="small">
                                        <li>Historical returns: 7-10%</li>
                                        <li>Dividends and growth</li>
                                        <li>Liquidity</li>
                                    </ul>
                                    <h6 class="text-danger">Cons:</h6>
                                    <ul class="small">
                                        <li>Market volatility</li>
                                        <li>Potential for loss</li>
                                        <li>Requires patience</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Bonds (Fixed Income)</h6>
                                    <p>Loans to governments or companies providing steady income.</p>
                                    <h6 class="text-success">Pros:</h6>
                                    <ul class="small">
                                        <li>Steady income</li>
                                        <li>Lower volatility</li>
                                        <li>Capital preservation</li>
                                    </ul>
                                    <h6 class="text-danger">Cons:</h6>
                                    <ul class="small">
                                        <li>Lower returns (3-5%)</li>
                                        <li>Interest rate risk</li>
                                        <li>Inflation erosion</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Investment Vehicles</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Index Funds</h6>
                                    <p>Passively managed funds tracking market indices.</p>
                                    <ul class="small">
                                        <li>Low expense ratios (0.03-0.20%)</li>
                                        <li>Market-matching returns</li>
                                        <li>Diversification across hundreds of stocks</li>
                                        <li>Warren Buffett's recommended starting point</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>ETFs vs. Mutual Funds</h6>
                                    <p>Exchange-traded funds offer unique advantages.</p>
                                    <div class="row">
                                        <div class="col-6">
                                            <h6 class="text-success">ETFs</h6>
                                            <ul class="small">
                                                <li>Trade like stocks</li>
                                                <li>Intraday pricing</li>
                                                <li>Lower minimums</li>
                                            </ul>
                                        </div>
                                        <div class="col-6">
                                            <h6 class="text-primary">Mutual Funds</h6>
                                            <ul class="small">
                                                <li>End-of-day pricing</li>
                                                <li>Professional management</li>
                                                <li>Higher minimums</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                topics: [
                    "Risk-return tradeoff and time horizon importance",
                    "Stocks, bonds, and cash as core asset classes",
                    "Index funds vs. actively managed funds",
                    "ETFs vs. mutual funds comparison",
                    "Dollar-cost averaging strategy",
                    "Investment fees and expense ratio impact"
                ],
                takeaways: [
                    "Develop a simple core investment policy statement",
                    "Create a starter fund lineup with appropriate asset allocation",
                    "Set up regular investment contributions"
                ]
            },
            {
                id: 6,
                title: "Portfolio Construction & Risk",
                icon: "bi-pie-chart",
                color: "secondary",
                description: "Build a well-diversified investment portfolio that matches your risk tolerance and financial goals.",
                content: `
                    <h4>Strategic Asset Allocation</h4>
                    <p>Studies show that asset allocation determines 91.5% of portfolio performance variation (Brinson, Hood, Beebower, 1986). Getting this right is crucial.</p>

                    <h5>Risk Tolerance Assessment</h5>
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h6 class="text-success">Conservative</h6>
                                    <h4>20/80</h4>
                                    <p class="small">20% stocks, 80% bonds/cash</p>
                                    <p class="small text-muted">Suitable for risk-averse investors</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h6 class="text-warning">Moderate</h6>
                                    <h4>50/50</h4>
                                    <p class="small">50% stocks, 50% bonds/cash</p>
                                    <p class="small text-muted">Balanced approach for most investors</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h6 class="text-danger">Aggressive</h6>
                                    <h4>80/20</h4>
                                    <p class="small">80% stocks, 20% bonds/cash</p>
                                    <p class="small text-muted">For growth-oriented investors</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Diversification Strategies</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Domestic vs. International</h6>
                                    <p>Don't put all your eggs in one geographic basket.</p>
                                    <ul class="small">
                                        <li><strong>US Stocks:</strong> 50-70% for most portfolios</li>
                                        <li><strong>International:</strong> 20-30% for global exposure</li>
                                        <li><strong>Emerging Markets:</strong> 5-10% for higher growth potential</li>
                                        <li><strong>Currency Diversification:</strong> Natural hedge against US dollar weakness</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Sector and Factor Diversification</h6>
                                    <p>Spread risk across different industries and investment factors.</p>
                                    <ul class="small">
                                        <li><strong>Technology:</strong> High growth, high volatility</li>
                                        <li><strong>Healthcare:</strong> Defensive, demographic tailwinds</li>
                                        <li><strong>Financials:</strong> Interest rate sensitive</li>
                                        <li><strong>Energy:</strong> Commodity price dependent</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Rebalancing and Maintenance</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Rebalancing Strategies</h6>
                                    <p>Keep your portfolio aligned with target allocation.</p>
                                    <ul class="small">
                                        <li><strong>Calendar Method:</strong> Rebalance annually or semi-annually</li>
                                        <li><strong>Threshold Method:</strong> Rebalance when allocation drifts 5-10%</li>
                                        <li><strong>Hybrid Approach:</strong> Combine both methods</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Sequence of Returns Risk</h6>
                                    <p>The timing of market returns matters, especially for retirees.</p>
                                    <ul class="small">
                                        <li><strong>Early Retirement Risk:</strong> Poor market performance in first few years</li>
                                        <li><strong>Safe Withdrawal Rate:</strong> 4% rule may need adjustment</li>
                                        <li><strong>Bond Tent Strategy:</strong> Increase bond allocation approaching retirement</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="alert alert-warning">
                        <h6><i class="bi bi-exclamation-triangle"></i> Important Note</h6>
                        <p>Past performance doesn't guarantee future results. Diversification doesn't ensure profit or protect against loss. Consider consulting with a financial advisor for personalized advice.</p>
                    </div>
                `,
                topics: [
                    "Asset allocation based on risk tolerance and goals",
                    "Domestic vs. international diversification benefits",
                    "Sector and factor-based diversification",
                    "Rebalancing strategies and thresholds",
                    "Sequence of returns risk for retirees"
                ],
                takeaways: [
                    "Determine your target asset allocation based on risk tolerance",
                    "Establish rebalancing thresholds and schedule",
                    "Create an annual portfolio maintenance checklist"
                ]
            },
            {
                id: 7,
                title: "Retirement & Tax-Advantaged Accounts",
                icon: "bi-house-door",
                color: "success",
                description: "Maximize retirement savings through tax-advantaged accounts and strategic contribution planning.",
                content: `
                    <h4>Tax-Advantaged Retirement Accounts</h4>
                    <p>Americans are facing a $4.3 trillion retirement savings gap (Northwestern Mutual, 2023). Tax-advantaged accounts can help bridge this gap through compound growth and tax savings.</p>

                    <h5>Employer-Sponsored Plans</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>401(k) Plans</h6>
                                    <p>Most common employer-sponsored retirement plan.</p>
                                    <h6 class="text-success">Key Advantages:</h6>
                                    <ul class="small">
                                        <li>Pre-tax contributions reduce taxable income</li>
                                        <li>Employer matching (free money!)</li>
                                        <li>Tax-deferred growth</li>
                                        <li>2024 contribution limit: $23,000</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>403(b) Plans</h6>
                                    <p>Similar to 401(k) but for non-profit and education employees.</p>
                                    <ul class="small">
                                        <li>Same contribution limits as 401(k)</li>
                                        <li>Often includes annuity options</li>
                                        <li>Similar tax advantages</li>
                                        <li>Employer matching common</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Individual Retirement Accounts</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Traditional IRA</h6>
                                    <p>Tax-deductible contributions with tax-deferred growth.</p>
                                    <ul class="small">
                                        <li>2024 contribution limit: $7,000</li>
                                        <li>Tax-deductible contributions</li>
                                        <li>Withdrawals taxed as ordinary income</li>
                                        <li>Required minimum distributions at age 73</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Roth IRA</h6>
                                    <p>After-tax contributions with tax-free growth and withdrawals.</p>
                                    <ul class="small">
                                        <li>2024 contribution limit: $7,000</li>
                                        <li>After-tax contributions (no deduction)</li>
                                        <li>Tax-free qualified withdrawals</li>
                                        <li>No required minimum distributions</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Health Savings Accounts (HSAs)</h5>
                    <div class="card">
                        <div class="card-body">
                            <h6>Triple Tax Advantage</h6>
                            <p>HSAs offer the best tax treatment available for retirement savings.</p>
                            <div class="row text-center">
                                <div class="col-md-4">
                                    <h6 class="text-success">Contributions</h6>
                                    <p class="small">Pre-tax (reduces taxable income)</p>
                                </div>
                                <div class="col-md-4">
                                    <h6 class="text-success">Growth</h6>
                                    <p class="small">Tax-deferred</p>
                                </div>
                                <div class="col-md-4">
                                    <h6 class="text-success">Withdrawals</h6>
                                    <p class="small">Tax-free for medical expenses</p>
                                </div>
                            </div>
                            <p class="mt-3"><strong>2024 Contribution Limits:</strong> $4,150 individual, $8,300 family</p>
                        </div>
                    </div>

                    <h5>Contribution Priority Order</h5>
                    <div class="alert alert-info">
                        <h6><i class="bi bi-trophy"></i> Optimal Contribution Strategy</h6>
                        <ol>
                            <li><strong>Employer Match:</strong> Contribute enough to get full employer matching (typically 3-6% of salary)</li>
                            <li><strong>High-Interest Debt:</strong> Pay off credit cards and personal loans (rates often 15-25%)</li>
                            <li><strong>Emergency Fund:</strong> Build 3-6 months of expenses in high-yield savings</li>
                            <li><strong>HSA:</strong> Max out for triple tax advantages</li>
                            <li><strong>401(k)/403(b):</strong> Contribute up to employer match, then max out</li>
                            <li><strong>IRA:</strong> Traditional or Roth based on income and tax situation</li>
                            <li><strong>Taxable Brokerage:</strong> For additional investment capacity</li>
                        </ol>
                    </div>
                `,
                topics: [
                    "401(k), 403(b), and other employer-sponsored plans",
                    "Traditional vs. Roth IRA comparison",
                    "Health Savings Accounts (HSAs) and triple tax advantage",
                    "Employer matching and vesting schedules",
                    "Contribution limits and catch-up provisions",
                    "Rollovers, early withdrawals, and penalty exceptions"
                ],
                takeaways: [
                    "Establish contribution priority order for maximum tax benefits",
                    "Create a contribution plan to capture employer matches",
                    "Develop strategy for Roth vs. Traditional account selection"
                ]
            },
            {
                id: 8,
                title: "Taxes 101 (Personal Finance Focus)",
                icon: "bi-receipt",
                color: "warning",
                description: "Understand how taxes impact your income and investments to minimize your tax burden legally.",
                content: `
                    <h4>Tax Fundamentals for Individuals</h4>
                    <p>The average American pays about 13.3% of their income in federal income taxes (Tax Foundation, 2023). Understanding tax strategies can help you keep more of what you earn.</p>

                    <h5>Tax Brackets and Marginal vs. Effective Rates</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>2024 Federal Income Tax Brackets</h6>
                                    <p class="text-muted">Single Filer (Married Filing Jointly in parentheses)</p>
                                    <ul class="small">
                                        <li><strong>10%:</strong> $0 - $11,600 ($0 - $23,200)</li>
                                        <li><strong>12%:</strong> $11,601 - $47,150 ($23,201 - $94,300)</li>
                                        <li><strong>22%:</strong> $47,151 - $100,525 ($94,301 - $201,050)</li>
                                        <li><strong>24%:</strong> $100,526 - $191,950 ($201,051 - $383,900)</li>
                                        <li><strong>32%:</strong> $191,951 - $243,725 ($383,901 - $487,450)</li>
                                        <li><strong>35%:</strong> $243,726 - $609,350 ($487,451 - $731,200)</li>
                                        <li><strong>37%:</strong> $609,351+ ($731,201+)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Marginal vs. Effective Rate</h6>
                                    <div class="bg-light p-3 rounded">
                                        <p><strong>Marginal Rate:</strong> The tax rate on your next dollar of income</p>
                                        <p><strong>Effective Rate:</strong> Your total tax divided by total income</p>
                                        <div class="text-center mt-3">
                                            <h5>Example:</h5>
                                            <p>$80,000 income = 22% marginal rate</p>
                                            <p>But effective rate might be 15%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Tax Deductions and Credits</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Standard vs. Itemized Deductions</h6>
                                    <ul class="small">
                                        <li><strong>Standard Deduction (2024):</strong></li>
                                        <li>• Single: $14,600</li>
                                        <li>• Married Filing Jointly: $29,200</li>
                                        <li>• Head of Household: $21,900</li>
                                        <li><strong>Itemized Deductions:</strong></li>
                                        <li>• Medical expenses (over 7.5% AGI)</li>
                                        <li>• State and local taxes (up to $10,000)</li>
                                        <li>• Mortgage interest</li>
                                        <li>• Charitable contributions</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Tax Credits</h6>
                                    <p>Credits reduce your tax bill dollar-for-dollar (better than deductions).</p>
                                    <ul class="small">
                                        <li><strong>Child Tax Credit:</strong> Up to $2,000 per child</li>
                                        <li><strong>Earned Income Tax Credit:</strong> For low-income workers</li>
                                        <li><strong>Education Credits:</strong> American Opportunity Credit</li>
                                        <li><strong>Energy Credits:</strong> For energy-efficient home improvements</li>
                                        <li><strong>Retirement Savings Credit:</strong> For low-income savers</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Investment Tax Considerations</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Capital Gains Tax Rates</h6>
                                    <p>Tax treatment depends on holding period.</p>
                                    <ul class="small">
                                        <li><strong>Short-term (≤1 year):</strong> Taxed as ordinary income (up to 37%)</li>
                                        <li><strong>Long-term (≥1 year):</strong> Preferential rates:</li>
                                        <li>• 0% for income up to $47,025 (single)</li>
                                        <li>• 15% for income $47,026 - $518,900</li>
                                        <li>• 20% for income over $518,900</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Tax-Loss Harvesting</h6>
                                    <p>Use investment losses to offset gains and reduce taxes.</p>
                                    <ul class="small">
                                        <li>Sell losing investments to realize losses</li>
                                        <li>Offset up to $3,000 in ordinary income annually</li>
                                        <li>Carry forward excess losses indefinitely</li>
                                        <li>Wash sale rules prevent immediate repurchase</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>W-4 Optimization</h5>
                    <div class="card bg-light">
                        <div class="card-body">
                            <h6>Adjusting Your Withholdings</h6>
                            <p>Avoid surprises at tax time by properly setting your W-4 form.</p>
                            <ul class="small">
                                <li><strong>Too much withholding:</strong> Interest-free loan to government</li>
                                <li><strong>Too little withholding:</strong> Underpayment penalties</li>
                                <li><strong>Life changes:</strong> Marriage, children, home purchase affect taxes</li>
                                <li><strong>IRS Withholding Estimator:</strong> Free tool for accurate calculation</li>
                            </ul>
                        </div>
                    </div>
                `,
                topics: [
                    "Marginal vs. effective tax rates",
                    "Federal income tax brackets",
                    "Standard vs. itemized deductions",
                    "Tax credits and their impact",
                    "Capital gains and dividend taxation",
                    "Tax-loss harvesting strategies"
                ],
                takeaways: [
                    "Create a personalized tax checklist for deductions and credits",
                    "Develop a withholdings review plan using IRS tools",
                    "Implement tax-loss harvesting for investment accounts"
                ]
            },
            {
                id: 9,
                title: "Insurance & Risk Management",
                icon: "bi-shield-check",
                color: "info",
                description: "Protect your financial well-being through appropriate insurance coverage and risk management strategies.",
                content: `
                    <h4>Insurance as Financial Protection</h4>
                    <p>Americans spend about $5,000 annually on insurance premiums (Gallup, 2023). The right insurance provides peace of mind without overpaying for unnecessary coverage.</p>

                    <h5>Essential Insurance Types</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Health Insurance</h6>
                                    <p>Protects against medical expenses that can devastate finances.</p>
                                    <h6 class="text-success">Coverage Considerations:</h6>
                                    <ul class="small">
                                        <li><strong>Deductible:</strong> $1,500-$3,000 typical</li>
                                        <li><strong>Premium vs. Deductible:</strong> Balance monthly cost vs. out-of-pocket</li>
                                        <li><strong>Network:</strong> In-network vs. out-of-network providers</li>
                                        <li><strong>Prescription Coverage:</strong> Formulary and copays</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Auto Insurance</h6>
                                    <p>Required in most states, protects against liability and damage.</p>
                                    <h6 class="text-success">Key Coverages:</h6>
                                    <ul class="small">
                                        <li><strong>Liability:</strong> $100,000/$300,000 minimum recommended</li>
                                        <li><strong>Collision:</strong> Pays for damage to your vehicle</li>
                                        <li><strong>Comprehensive:</strong> Theft, vandalism, weather damage</li>
                                        <li><strong>Uninsured Motorist:</strong> Protection when other driver has no insurance</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Life Insurance Fundamentals</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Term Life Insurance</h6>
                                    <p>Pure death benefit protection for a specific period.</p>
                                    <h6 class="text-success">Best For:</h6>
                                    <ul class="small">
                                        <li>Income replacement (20-30 years)</li>
                                        <li>Mortgage protection</li>
                                        <li>Young families</li>
                                        <li>Affordable premiums</li>
                                    </ul>
                                    <p class="small text-muted"><strong>Cost:</strong> $500-1,000/year for $500,000 coverage (30-year-old)</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Whole Life Insurance</h6>
                                    <p>Permanent coverage with cash value accumulation.</p>
                                    <h6 class="text-warning">Considerations:</h6>
                                    <ul class="small">
                                        <li>Lifetime coverage guarantee</li>
                                        <li>Cash value grows tax-deferred</li>
                                        <li>Much higher premiums</li>
                                        <li>Complex fee structure</li>
                                    </ul>
                                    <p class="small text-muted"><strong>Cost:</strong> $5,000-8,000/year for $500,000 coverage</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Home and Property Insurance</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Homeowners Insurance</h6>
                                    <p>Comprehensive protection for your home and belongings.</p>
                                    <h6 class="text-success">Standard Coverages:</h6>
                                    <ul class="small">
                                        <li><strong>Dwelling:</strong> Structure of your home</li>
                                        <li><strong>Personal Property:</strong> Belongings inside</li>
                                        <li><strong>Liability:</strong> Injury or damage to others</li>
                                        <li><strong>Additional Living Expenses:</strong> Temporary housing if home uninhabitable</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Renters Insurance</h6>
                                    <p>Essential protection for tenants' personal property.</p>
                                    <ul class="small">
                                        <li><strong>Personal Property:</strong> $20,000-$50,000 typical</li>
                                        <li><strong>Liability:</strong> $100,000-$300,000</li>
                                        <li><strong>Additional Living Expenses:</strong> If unit becomes uninhabitable</li>
                                        <li><strong>Very Affordable:</strong> $15-30/month</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Risk Management Strategies</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Deductible Optimization</h6>
                                    <p>Balance premium costs with out-of-pocket exposure.</p>
                                    <ul class="small">
                                        <li><strong>Higher Deductible:</strong> Lower premiums, more risk</li>
                                        <li><strong>Lower Deductible:</strong> Higher premiums, less risk</li>
                                        <li><strong>Emergency Fund:</strong> Should cover your deductible</li>
                                        <li><strong>Bundle Policies:</strong> Multi-policy discounts</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Umbrella Insurance</h6>
                                    <p>Extra liability protection beyond standard policies.</p>
                                    <ul class="small">
                                        <li><strong>Coverage:</strong> $1-5 million additional liability</li>
                                        <li><strong>Cost:</strong> $150-300/year for $1 million</li>
                                        <li><strong>Requirements:</strong> Usually need underlying auto/home policies</li>
                                        <li><strong>High Net Worth:</strong> Essential for asset protection</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="alert alert-info">
                        <h6><i class="bi bi-info-circle"></i> Insurance Planning Tips</h6>
                        <ul>
                            <li>Review policies annually for coverage adequacy</li>
                            <li>Update beneficiaries when life circumstances change</li>
                            <li>Consider disability insurance if you're a high earner</li>
                            <li>Bundle policies with same insurer for discounts</li>
                        </ul>
                    </div>
                `,
                topics: [
                    "Health insurance plan selection and costs",
                    "Disability insurance for income protection",
                    "Life insurance (term vs. whole life)",
                    "Auto, home, and renters insurance",
                    "Deductible selection and coverage gaps",
                    "Beneficiary designations and updates"
                ],
                takeaways: [
                    "Conduct coverage audit with minimum recommended amounts",
                    "Optimize deductibles based on emergency fund size",
                    "Create beneficiary update checklist for all policies"
                ]
            },
            {
                id: 10,
                title: "Asset Ownership (Real Estate, Vehicles, Business, Equity Compensation)",
                icon: "bi-building",
                color: "primary",
                description: "Make informed decisions about major purchases and understand different ownership structures.",
                content: `
                    <h4>Major Asset Purchase Decisions</h4>
                    <p>Americans make major purchase decisions that impact their finances for years. Understanding the true costs and benefits is crucial for making wise choices.</p>

                    <h5>Real Estate Decisions</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Buy vs. Rent Analysis</h6>
                                    <p>Consider both financial and lifestyle factors.</p>
                                    <h6 class="text-success">Financial Factors:</h6>
                                    <ul class="small">
                                        <li><strong>Price-to-Rent Ratio:</strong> Under 15-20 suggests buying</li>
                                        <li><strong>Transaction Costs:</strong> 2-5% to buy, 7-10% to sell</li>
                                        <li><strong>Maintenance:</strong> 1-2% of home value annually</li>
                                        <li><strong>Tax Benefits:</strong> Mortgage interest deduction</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Mortgage Fundamentals</h6>
                                    <p>Understanding loan terms and costs.</p>
                                    <ul class="small">
                                        <li><strong>Interest Rates:</strong> 30-year fixed most common</li>
                                        <li><strong>Points:</strong> Prepaid interest to lower rate</li>
                                        <li><strong>PMI:</strong> Required if down payment <20%</li>
                                        <li><strong>Closing Costs:</strong> 2-5% of loan amount</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Vehicle Ownership</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Total Cost of Ownership (TCO)</h6>
                                    <p>Vehicle expenses extend far beyond the purchase price.</p>
                                    <div class="bg-light p-3 rounded">
                                        <h6 class="text-center">Average Annual Costs (2023 data):</h6>
                                        <ul class="text-center list-unstyled">
                                            <li><strong>$4,000:</strong> Depreciation</li>
                                            <li><strong>$1,500:</strong> Fuel</li>
                                            <li><strong>$1,200:</strong> Insurance</li>
                                            <li><strong>$800:</strong> Maintenance</li>
                                            <li><strong>$500:</strong> Registration/Fees</li>
                                            <li><strong>$8,000+ Total Annual Cost</strong></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Buy vs. Lease Decision</h6>
                                    <p>Choose based on your driving patterns and preferences.</p>
                                    <div class="row">
                                        <div class="col-6">
                                            <h6 class="text-success">Buying Advantages</h6>
                                            <ul class="small">
                                                <li>Ownership after payoff</li>
                                                <li>No mileage restrictions</li>
                                                <li>Customization allowed</li>
                                            </ul>
                                        </div>
                                        <div class="col-6">
                                            <h6 class="text-primary">Leasing Advantages</h6>
                                            <ul class="small">
                                                <li>Lower monthly payments</li>
                                                <li>New car every 2-3 years</li>
                                                <li>Warranty coverage</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Business Ownership</h5>
                    <div class="card">
                        <div class="card-body">
                            <h6>Starting a Business</h6>
                            <p>Entrepreneurship offers potential rewards but requires careful planning.</p>
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-success">Business Structures:</h6>
                                    <ul class="small">
                                        <li><strong>Sole Proprietorship:</strong> Simple, personal liability</li>
                                        <li><strong>LLC:</strong> Limited liability, flexible taxation</li>
                                        <li><strong>S-Corporation:</strong> Tax advantages for established businesses</li>
                                        <li><strong>Corporation:</strong> Complex but offers most protection</li>
                                    </ul>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-warning">Key Considerations:</h6>
                                    <ul class="small">
                                        <li>Business plan development</li>
                                        <li>Startup capital requirements</li>
                                        <li>Legal and regulatory compliance</li>
                                        <li>Insurance needs (liability, workers comp)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Equity Compensation</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Restricted Stock Units (RSUs)</h6>
                                    <p>Company stock granted as compensation with vesting schedule.</p>
                                    <ul class="small">
                                        <li><strong>Vesting:</strong> Typically 4-year schedule with 1-year cliff</li>
                                        <li><strong>Taxation:</strong> Taxed as income when vested</li>
                                        <li><strong>Liquidity:</strong> Can sell after vesting period</li>
                                        <li><strong>Risk:</strong> Concentrated position in one stock</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Stock Options</h6>
                                    <p>Right to buy company stock at predetermined price.</p>
                                    <div class="row">
                                        <div class="col-6">
                                            <h6 class="text-success">Incentive Stock Options (ISOs)</h6>
                                            <ul class="small">
                                                <li>Tax advantages</li>
                                                <li>Long-term capital gains</li>
                                                <li>AMT considerations</li>
                                            </ul>
                                        </div>
                                        <div class="col-6">
                                            <h6 class="text-primary">Non-Qualified Stock Options (NSOs)</h6>
                                            <ul class="small">
                                                <li>Taxed as ordinary income</li>
                                                <li>More flexible</li>
                                                <li>No AMT issues</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="alert alert-warning">
                        <h6><i class="bi bi-exclamation-triangle"></i> Important Considerations</h6>
                        <ul>
                            <li><strong>Real Estate:</strong> Consider property taxes, HOA fees, and maintenance costs</li>
                            <li><strong>Vehicles:</strong> Factor in depreciation, fuel efficiency, and maintenance costs</li>
                            <li><strong>Business:</strong> Understand personal liability and tax implications</li>
                            <li><strong>Equity Compensation:</strong> Diversify concentrated stock positions to manage risk</li>
                        </ul>
                    </div>
                `,
                topics: [
                    "Buy vs. rent frameworks and calculations",
                    "Mortgage rates, points, and terms",
                    "Total cost of vehicle ownership",
                    "Vehicle titling and registration",
                    "Business structures and LLC basics",
                    "Equity compensation (RSUs, ESPP, stock options)"
                ],
                takeaways: [
                    "Develop decision frameworks for major purchases",
                    "Create pre-purchase checklists for real estate and vehicles",
                    "Compile equity compensation questions for HR/benefits team"
                ]
            },
            {
                id: 11,
                title: "Financial Planning & Life Events",
                icon: "bi-calendar-event",
                color: "success",
                description: "Create a comprehensive financial plan that adapts to life's major milestones and transitions.",
                content: `
                    <h4>Holistic Financial Planning</h4>
                    <p>Life events can significantly impact your financial situation. A comprehensive plan helps you navigate these transitions successfully.</p>

                    <h5>SMART Financial Goals</h5>
                    <div class="card bg-light">
                        <div class="card-body">
                            <h6>Specific, Measurable, Achievable, Relevant, Time-bound</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-danger">❌ Poor Goal</h6>
                                    <p class="small">"Save more money"</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-success">✅ SMART Goal</h6>
                                    <p class="small">"Save $10,000 for emergency fund by December 31st through $500 monthly transfers"</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Timeline Planning</h5>
                    <div class="row">
                        <div class="col-md-3">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h6>1-Year Goals</h6>
                                    <p class="small">Build emergency fund, pay off small debts</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h6>3-Year Goals</h6>
                                    <p class="small">Save for down payment, eliminate consumer debt</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h6>5-Year Goals</h6>
                                    <p class="small">Max retirement contributions, build investment portfolio</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card h-100 text-center">
                                <div class="card-body">
                                    <h6>10-Year Goals</h6>
                                    <p class="small">Achieve financial independence, fund college education</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Major Life Events Planning</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Marriage</h6>
                                    <ul class="small">
                                        <li>Combine or separate finances</li>
                                        <li>Update insurance policies</li>
                                        <li>Revise estate planning</li>
                                        <li>Adjust tax withholding</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Children</h6>
                                    <ul class="small">
                                        <li>Life insurance needs increase</li>
                                        <li>529 college savings plans</li>
                                        <li>Child tax credits and deductions</li>
                                        <li>Emergency fund adjustments</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Job Changes</h6>
                                    <ul class="small">
                                        <li>Review new benefits package</li>
                                        <li>Update retirement contributions</li>
                                        <li>Adjust tax withholding</li>
                                        <li>Consider COBRA coverage</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Home Purchase</h6>
                                    <ul class="small">
                                        <li>Save for down payment (20% ideal)</li>
                                        <li>Get pre-approved for mortgage</li>
                                        <li>Factor in all ownership costs</li>
                                        <li>Review homeowner's insurance</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Estate Planning Essentials</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Core Documents</h6>
                                    <ul class="small">
                                        <li><strong>Will:</strong> Distributes assets after death</li>
                                        <li><strong>Power of Attorney:</strong> Financial decisions if incapacitated</li>
                                        <li><strong>Healthcare Directive:</strong> Medical decisions if unable</li>
                                        <li><strong>Beneficiary Designations:</strong> Retirement accounts, life insurance</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>When to Update</h6>
                                    <ul class="small">
                                        <li>Marriage or divorce</li>
                                        <li>Birth or adoption</li>
                                        <li>Death in family</li>
                                        <li>Major asset purchase</li>
                                        <li>Every 3-5 years minimum</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Account Consolidation Strategy</h5>
                    <div class="alert alert-info">
                        <h6><i class="bi bi-funnel"></i> Account Organization Framework</h6>
                        <ol>
                            <li><strong>Inventory:</strong> List all financial accounts and their purposes</li>
                            <li><strong>Categorize:</strong> Group by function (emergency, retirement, investment, etc.)</li>
                            <li><strong>Consolidate:</strong> Combine similar accounts where beneficial</li>
                            <li><strong>Automate:</strong> Set up automatic transfers and payments</li>
                            <li><strong>Review:</strong> Annual review of account structure and performance</li>
                        </ol>
                    </div>
                `,
                topics: [
                    "SMART goal setting methodology",
                    "1/3/5/10-year financial timelines",
                    "Education funding strategies",
                    "Family changes and financial implications",
                    "Major purchases and relocation planning",
                    "Estate planning essentials (wills, POAs, directives)"
                ],
                takeaways: [
                    "Create a one-page financial plan with goals and timelines",
                    "Develop next-step task lists for each life stage",
                    "Establish basic estate planning checklist"
                ]
            },
            {
                id: 12,
                title: "Fraud, Consumer Rights & Behavioral Finance",
                icon: "bi-shield-exclamation",
                color: "danger",
                description: "Protect yourself from financial fraud while understanding the psychological factors that influence money decisions.",
                content: `
                    <h4>Financial Security and Decision Making</h4>
                    <p>Identity theft affects 33% of Americans (Javelin Strategy, 2023). Understanding both security measures and psychological factors helps protect your financial well-being.</p>

                    <h5>Common Financial Scams</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Most Common Scams</h6>
                                    <ul class="small">
                                        <li><strong>Investment Scams:</strong> Fake opportunities promising high returns</li>
                                        <li><strong>Romance Scams:</strong> Fake relationships targeting lonely individuals</li>
                                        <li><strong>Tech Support Scams:</strong> Fake computer help requests</li>
                                        <li><strong>Government Impersonation:</strong> Fake IRS or Social Security calls</li>
                                        <li><strong>Grandparent Scams:</strong> Emergency requests from "family members"</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Red Flags to Watch For</h6>
                                    <ul class="small">
                                        <li>Unsolicited contact or urgency</li>
                                        <li>Requests for payment in gift cards or crypto</li>
                                        <li>Promises of guaranteed returns</li>
                                        <li>Pressure to act immediately</li>
                                        <li>Secrecy or confidentiality requests</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Identity Theft Prevention</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Preventive Measures</h6>
                                    <ul class="small">
                                        <li><strong>Credit Freezes:</strong> Free at all three bureaus</li>
                                        <li><strong>Fraud Alerts:</strong> 90-day initial alert, renewable</li>
                                        <li><strong>Password Managers:</strong> Strong, unique passwords</li>
                                        <li><strong>Two-Factor Authentication:</strong> Required for financial accounts</li>
                                        <li><strong>Shred Documents:</strong> Destroy sensitive paperwork</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Recovery Steps</h6>
                                    <ol class="small">
                                        <li>Contact credit bureaus for fraud alerts</li>
                                        <li>File police report in your jurisdiction</li>
                                        <li>Contact financial institutions</li>
                                        <li>File FTC identity theft report</li>
                                        <li>Monitor accounts for 12-24 months</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Consumer Protection Rights</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>FDIC Insurance</h6>
                                    <p>Bank account protection up to $250,000 per depositor.</p>
                                    <ul class="small">
                                        <li>Covers checking and savings accounts</li>
                                        <li>Certificates of deposit</li>
                                        <li>Money market accounts</li>
                                        <li>Automatic coverage for joint accounts</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>SIPC Protection</h6>
                                    <p>Brokerage account protection up to $500,000.</p>
                                    <ul class="small">
                                        <li>Covers stocks, bonds, ETFs</li>
                                        <li>Mutual funds</li>
                                        <li>Does NOT cover market losses</li>
                                        <li>Separate from FDIC insurance</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Behavioral Finance Biases</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Common Cognitive Biases</h6>
                                    <ul class="small">
                                        <li><strong>Loss Aversion:</strong> Fear of losses outweighs potential gains</li>
                                        <li><strong>Overconfidence:</strong> Overestimating our abilities</li>
                                        <li><strong>Present Bias:</strong> Preferring immediate rewards</li>
                                        <li><strong>Anchoring:</strong> Relying too heavily on first information</li>
                                        <li><strong>Herd Mentality:</strong> Following the crowd</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6>Mitigation Strategies</h6>
                                    <ul class="small">
                                        <li><strong>Automated Savings:</strong> Overcome present bias</li>
                                        <li><strong>Diversification:</strong> Reduce overconfidence impact</li>
                                        <li><strong>Long-term Focus:</strong> Counter loss aversion</li>
                                        <li><strong>Written Plans:</strong> Avoid anchoring to bad information</li>
                                        <li><strong>Accountability Partners:</strong> Combat herd mentality</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5>Dispute Resolution</h5>
                    <div class="card bg-light">
                        <div class="card-body">
                            <h6>Consumer Protection Resources</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Federal Agencies:</h6>
                                    <ul class="small">
                                        <li><strong>CFPB:</strong> Consumer Financial Protection Bureau</li>
                                        <li><strong>FTC:</strong> Federal Trade Commission</li>
                                        <li><strong>FCC:</strong> Federal Communications Commission</li>
                                        <li><strong>SEC:</strong> Securities and Exchange Commission</li>
                                    </ul>
                                </div>
                                <div class="col-md-6">
                                    <h6>State Resources:</h6>
                                    <ul class="small">
                                        <li>State Attorney General offices</li>
                                        <li>Better Business Bureau</li>
                                        <li>State banking regulators</li>
                                        <li>Consumer protection divisions</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="alert alert-success">
                        <h6><i class="bi bi-check-circle"></i> Security Hygiene Checklist</h6>
                        <div class="row">
                            <div class="col-md-6">
                                <ul class="small">
                                    <li>✓ Use credit freezes at all bureaus</li>
                                    <li>✓ Enable fraud alerts when needed</li>
                                    <li>✓ Use strong, unique passwords</li>
                                    <li>✓ Enable 2FA on all accounts</li>
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <ul class="small">
                                    <li>✓ Monitor accounts regularly</li>
                                    <li>✓ Shred sensitive documents</li>
                                    <li>✓ Be skeptical of unsolicited contacts</li>
                                    <li>✓ Keep software updated</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                `,
                topics: [
                    "Common financial scams and prevention",
                    "Identity theft recovery procedures",
                    "FDIC and SIPC insurance coverage",
                    "Consumer rights and dispute resolution",
                    "Behavioral finance biases and impact",
                    "Security hygiene and best practices"
                ],
                takeaways: [
                    "Implement security hygiene plan with freezes and alerts",
                    "Create bias-buster checklist for major decisions",
                    "Develop dispute and escalation template for issues"
                ]
            }
        ];
    }

    // Setup event listeners for module interactions
    setupEventListeners() {
        // Module card click events are handled in displayModulesGrid
        // Module detail view events are handled in showModuleDetail
    }

    // Display the modules grid on the modules page
    displayModulesGrid() {
        const grid = document.getElementById('modules-grid');
        if (!grid) return;

        grid.innerHTML = '';

        this.modules.forEach(module => {
            const isCompleted = this.completedModules.has(module.id);
            const card = document.createElement('div');
            card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';
            card.innerHTML = `
                <div class="card h-100 module-card ${isCompleted ? 'completed' : ''}" data-module-id="${module.id}" style="cursor: pointer;">
                    <div class="card-body text-center">
                        <div class="module-icon mb-3">
                            <i class="bi ${module.icon} fs-1 text-${module.color}"></i>
                        </div>
                        <h5 class="card-title">${module.title}</h5>
                        <p class="card-text text-muted">${module.description}</p>
                        <div class="module-status mt-3">
                            ${isCompleted ? '<span class="badge bg-success">✓ Completed</span>' : '<span class="badge bg-secondary">Not Started</span>'}
                        </div>
                    </div>
                </div>
            `;

            // Add click event listener
            card.querySelector('.module-card').addEventListener('click', () => {
                this.showModuleDetail(module.id);
            });

            grid.appendChild(card);
        });
    }

    // Show detailed view of a specific module
    showModuleDetail(moduleId) {
        const module = this.modules.find(m => m.id === moduleId);
        if (!module) return;

        this.currentModule = module;

        // Hide modules grid and show detail view
        document.getElementById('modules-grid').classList.add('d-none');
        document.getElementById('module-detail').classList.remove('d-none');

        // Update module detail content
        document.getElementById('module-name').textContent = module.title;
        document.getElementById('module-icon').className = `bi ${module.icon} me-2`;
        document.getElementById('module-content').innerHTML = module.content;

        // Update topics
        const topicsList = document.getElementById('module-topics');
        topicsList.innerHTML = '';
        module.topics.forEach(topic => {
            const li = document.createElement('li');
            li.className = 'mb-2';
            li.innerHTML = `<i class="bi bi-check-circle text-success me-2"></i>${topic}`;
            topicsList.appendChild(li);
        });

        // Update takeaways
        const takeawaysList = document.getElementById('module-takeaways');
        takeawaysList.innerHTML = '';
        module.takeaways.forEach(takeaway => {
            const li = document.createElement('li');
            li.className = 'mb-2';
            li.innerHTML = `<i class="bi bi-lightbulb text-warning me-2"></i>${takeaway}`;
            takeawaysList.appendChild(li);
        });

        // Update progress
        this.updateModuleProgress();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Show modules overview (back to grid)
    showModulesOverview() {
        document.getElementById('modules-grid').classList.remove('d-none');
        document.getElementById('module-detail').classList.add('d-none');
        this.currentModule = null;
    }

    // Update module progress indicator
    updateModuleProgress() {
        if (!this.currentModule) return;

        const isCompleted = this.completedModules.has(this.currentModule.id);
        const progressBar = document.getElementById('module-progress');
        const progressText = document.getElementById('progress-text');
        const markCompleteBtn = document.getElementById('mark-complete-btn');

        if (isCompleted) {
            progressBar.style.width = '100%';
            progressText.textContent = 'Completed';
            markCompleteBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Mark as Incomplete';
            markCompleteBtn.className = 'btn btn-warning w-100 mb-2';
        } else {
            progressBar.style.width = '0%';
            progressText.textContent = 'Not started';
            markCompleteBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Mark as Complete';
            markCompleteBtn.className = 'btn btn-success w-100 mb-2';
        }
    }

    // Mark module as complete/incomplete
    toggleModuleComplete() {
        if (!this.currentModule) return;

        const moduleId = this.currentModule.id;
        const isCompleted = this.completedModules.has(moduleId);

        if (isCompleted) {
            this.completedModules.delete(moduleId);
        } else {
            this.completedModules.add(moduleId);
        }

        this.saveCompletedModules();
        this.updateModuleProgress();
        this.displayModulesGrid(); // Refresh the grid to show updated status
    }

    // Print module content
    printModule() {
        if (!this.currentModule) return;

        const printContent = `
            <html>
                <head>
                    <title>${this.currentModule.title} - Financial Literacy Hub</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                        h1 { color: #0d6efd; }
                        h2 { color: #198754; margin-top: 30px; }
                        ul { margin-bottom: 20px; }
                        .topic { margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <h1>${this.currentModule.title}</h1>
                    <div>${this.currentModule.content.replace(/class="[^"]*"/g, '').replace(/<i[^>]*><\/i>/g, '')}</div>
                    <h2>Key Topics</h2>
                    <ul>${this.currentModule.topics.map(topic => `<li class="topic">${topic}</li>`).join('')}</ul>
                    <h2>What You'll Learn</h2>
                    <ul>${this.currentModule.takeaways.map(takeaway => `<li class="topic">${takeaway}</li>`).join('')}</ul>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }

    // Share module (basic implementation)
    shareModule() {
        if (!this.currentModule) return;

        const shareText = `Check out this financial literacy module: ${this.currentModule.title} - ${window.location.href}`;
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Module link copied to clipboard!');
        }).catch(() => {
            alert('Unable to copy to clipboard. Please copy this link manually: ' + shareText);
        });
    }
}

// Create global modules manager instance
const modulesManager = new ModulesManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('modules-grid')) {
        modulesManager.init();
    }
});

// Global functions for HTML onclick handlers
window.showModulesOverview = () => modulesManager.showModulesOverview();
window.goBack = () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = '/';
    }
};
window.toggleModuleComplete = () => modulesManager.toggleModuleComplete();
window.printModule = () => modulesManager.printModule();
window.shareModule = () => modulesManager.shareModule();
