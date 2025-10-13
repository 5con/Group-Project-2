using Microsoft.EntityFrameworkCore;

public class DatabaseSeeder
{
    private readonly AppDbContext _context;

    public DatabaseSeeder(AppDbContext context)
    {
        _context = context;
    }

    public void Seed()
    {
        if (_context.Categories.Any() || _context.StateParams.Any() || _context.FinancialModules.Any())
        {
            return; // Already seeded
        }

        SeedCategories();
        SeedStateParams();
        SeedFinancialModules();
    }

    private void SeedCategories()
    {
        var categories = new List<Category>
        {
            // Needs
            new Category { Name = "Housing", IsNeed = true },
            new Category { Name = "Utilities", IsNeed = true },
            new Category { Name = "Groceries", IsNeed = true },
            new Category { Name = "Transportation", IsNeed = true },
            new Category { Name = "Medical/Health", IsNeed = true },
            new Category { Name = "Insurance", IsNeed = true },
            new Category { Name = "Childcare", IsNeed = true },
            new Category { Name = "Minimum Debt Payments", IsNeed = true },

            // Wants
            new Category { Name = "Dining Out", IsNeed = false },
            new Category { Name = "Entertainment", IsNeed = false },
            new Category { Name = "Personal", IsNeed = false },
            new Category { Name = "Subscriptions", IsNeed = false },
            new Category { Name = "Misc", IsNeed = false },

            // Savings/Debt
            new Category { Name = "Emergency Fund", IsNeed = false },
            new Category { Name = "Sinking Funds", IsNeed = false },
            new Category { Name = "Extra Debt Payments", IsNeed = false },
            new Category { Name = "Retirement/Long-term", IsNeed = false }
        };

        _context.Categories.AddRange(categories);
        _context.SaveChanges();
    }

    private void SeedStateParams()
    {
        var stateParams = new List<StateParam>
        {
            new StateParam { State = "AL", ColaIndex = 0.87m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "AK", ColaIndex = 1.27m, EstEffectiveTaxRate = 0.15m },
            new StateParam { State = "AZ", ColaIndex = 0.95m, EstEffectiveTaxRate = 0.16m },
            new StateParam { State = "AR", ColaIndex = 0.85m, EstEffectiveTaxRate = 0.19m },
            new StateParam { State = "CA", ColaIndex = 1.35m, EstEffectiveTaxRate = 0.22m },
            new StateParam { State = "CO", ColaIndex = 1.05m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "CT", ColaIndex = 1.15m, EstEffectiveTaxRate = 0.20m },
            new StateParam { State = "DE", ColaIndex = 0.98m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "FL", ColaIndex = 0.97m, EstEffectiveTaxRate = 0.15m },
            new StateParam { State = "GA", ColaIndex = 0.91m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "HI", ColaIndex = 1.60m, EstEffectiveTaxRate = 0.21m },
            new StateParam { State = "ID", ColaIndex = 0.93m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "IL", ColaIndex = 0.95m, EstEffectiveTaxRate = 0.19m },
            new StateParam { State = "IN", ColaIndex = 0.88m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "IA", ColaIndex = 0.89m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "KS", ColaIndex = 0.87m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "KY", ColaIndex = 0.88m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "LA", ColaIndex = 0.92m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "ME", ColaIndex = 0.96m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "MD", ColaIndex = 1.10m, EstEffectiveTaxRate = 0.21m },
            new StateParam { State = "MA", ColaIndex = 1.25m, EstEffectiveTaxRate = 0.19m },
            new StateParam { State = "MI", ColaIndex = 0.91m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "MN", ColaIndex = 1.02m, EstEffectiveTaxRate = 0.20m },
            new StateParam { State = "MS", ColaIndex = 0.82m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "MO", ColaIndex = 0.88m, EstEffectiveTaxRate = 0.16m },
            new StateParam { State = "MT", ColaIndex = 0.96m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "NE", ColaIndex = 0.90m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "NV", ColaIndex = 0.98m, EstEffectiveTaxRate = 0.15m },
            new StateParam { State = "NH", ColaIndex = 1.05m, EstEffectiveTaxRate = 0.15m },
            new StateParam { State = "NJ", ColaIndex = 1.18m, EstEffectiveTaxRate = 0.20m },
            new StateParam { State = "NM", ColaIndex = 0.88m, EstEffectiveTaxRate = 0.16m },
            new StateParam { State = "NY", ColaIndex = 1.25m, EstEffectiveTaxRate = 0.22m },
            new StateParam { State = "NC", ColaIndex = 0.90m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "ND", ColaIndex = 0.94m, EstEffectiveTaxRate = 0.15m },
            new StateParam { State = "OH", ColaIndex = 0.89m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "OK", ColaIndex = 0.86m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "OR", ColaIndex = 1.08m, EstEffectiveTaxRate = 0.21m },
            new StateParam { State = "PA", ColaIndex = 0.98m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "RI", ColaIndex = 1.05m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "SC", ColaIndex = 0.89m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "SD", ColaIndex = 0.91m, EstEffectiveTaxRate = 0.15m },
            new StateParam { State = "TN", ColaIndex = 0.90m, EstEffectiveTaxRate = 0.15m },
            new StateParam { State = "TX", ColaIndex = 0.92m, EstEffectiveTaxRate = 0.15m },
            new StateParam { State = "UT", ColaIndex = 0.95m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "VT", ColaIndex = 1.05m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "VA", ColaIndex = 1.00m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "WA", ColaIndex = 1.10m, EstEffectiveTaxRate = 0.19m },
            new StateParam { State = "WV", ColaIndex = 0.83m, EstEffectiveTaxRate = 0.17m },
            new StateParam { State = "WI", ColaIndex = 0.94m, EstEffectiveTaxRate = 0.18m },
            new StateParam { State = "WY", ColaIndex = 0.95m, EstEffectiveTaxRate = 0.15m }
        };

        _context.StateParams.AddRange(stateParams);
        _context.SaveChanges();
    }

    private void SeedFinancialModules()
    {
        var modules = new List<FinancialModule>
        {
            new FinancialModule
            {
                Title = "Budgeting Basics",
                Description = "Learn the foundations of tracking income and expenses, creating budgets, and cash-flow control",
                Order = 1,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Budget Methods"",
                            ""content"":""Learn about zero-based, 50/30/20, and envelope budgeting methods. The 50/30/20 rule allocates 50% to needs, 30% to wants, and 20% to savings/debt. Zero-based budgeting gives every dollar a purpose. Envelope system uses cash for different categories."",
                            ""interactive"":{""type"":""quiz"",""question"":""Which budgeting method gives every dollar a specific purpose?"",""options"":[""50/30/20"",""Zero-based"",""Envelope System""],""correct"":1}
                        },
                        {
                            ""title"":""Fixed vs Variable Costs"",
                            ""content"":""Fixed costs stay the same each month (rent, insurance) while variable costs change (groceries, entertainment). Track both to understand your spending patterns."",
                            ""interactive"":{""type"":""sorting"",""items"":[""Rent"",""Groceries"",""Car Insurance"",""Dining Out""],""categories"":{""Fixed"":[""Rent"",""Car Insurance""],""Variable"":[""Groceries"",""Dining Out""]}}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Banking & Cash Management",
                Description = "How accounts work and optimizing for fees, yield, and access",
                Order = 2,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Account Types"",
                            ""content"":""Checking accounts for daily transactions, savings for emergencies, high-yield savings for better interest, CDs for locked funds with higher rates, money market for liquidity with some yield."",
                            ""interactive"":{""type"":""matching"",""pairs"":[{""left"":""Daily transactions"",""right"":""Checking""},{""left"":""Emergency fund"",""right"":""High-yield savings""},{""left"":""Locked funds, higher interest"",""right"":""CD""}]}
                        },
                        {
                            ""title"":""Account Security"",
                            ""content"":""Use strong passwords, enable 2FA, monitor accounts regularly, avoid public WiFi for banking, use credit cards over debit for fraud protection."",
                            ""interactive"":{""type"":""checklist"",""items"":[""Strong unique passwords"",""Two-factor authentication"",""Regular account monitoring"",""Credit card preference over debit""]}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Credit & Debt Management",
                Description = "Building credit responsibly and reducing costly debt",
                Order = 3,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Credit Scores"",
                            ""content"":""Credit scores range from 300-850. Factors include payment history (35%), amounts owed (30%), length of history (15%), new credit (10%), and credit mix (10%)."",
                            ""interactive"":{""type"":""percentage"",""question"":""What percentage of your credit score comes from payment history?"",""correct"":35}
                        },
                        {
                            ""title"":""Debt Strategies"",
                            ""content"":""Snowball method: pay smallest debts first for motivation. Avalanche method: pay highest interest first for savings. Both work - choose based on your personality."",
                            ""interactive"":{""type"":""comparison"",""question"":""Compare snowball vs avalanche methods"",""option1"":""Snowball - smallest debts first"",""option2"":""Avalanche - highest interest first""}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Saving & Emergency Funds",
                Description = "Short-term buffers and goal-based savings",
                Order = 4,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Emergency Fund"",
                            ""content"":""3-6 months of essential expenses in an easily accessible account. Start with $1,000, then build to 3 months, then 6 months for job security."",
                            ""interactive"":{""type"":""calculator"",""inputs"":[{""name"":""monthly_expenses"",""label"":""Monthly Essential Expenses""}],""formula"":""emergency_fund = monthly_expenses * 3"",""output"":""3-month emergency fund target""}
                        },
                        {
                            ""title"":""Savings Goals"",
                            ""content"":""Use SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound). Break large goals into smaller milestones. Automate transfers to savings accounts."",
                            ""interactive"":{""type"":""goal_setting"",""fields"":[""goal_name"",""target_amount"",""target_date"",""monthly_savings""]}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Investing Fundamentals",
                Description = "Why invest, risk/return, and time horizon basics",
                Order = 5,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Investment Types"",
                            ""content"":""Stocks: ownership in companies, high risk/reward. Bonds: loans to entities, lower risk. ETFs: baskets of investments, diversified. Mutual funds: professionally managed, varied fees."",
                            ""interactive"":{""type"":""categorization"",""items"":[""Apple Stock"",""US Treasury Bond"",""S&P 500 ETF"",""Vanguard Mutual Fund""],""categories"":{""Stocks"":[""Apple Stock""],""Bonds"":[""US Treasury Bond""],""ETFs"":[""S&P 500 ETF""],""Mutual Funds"":[""Vanguard Mutual Fund""]}}
                        },
                        {
                            ""title"":""Risk & Return"",
                            ""content"":""Risk and return are related - higher potential returns come with higher risk. Your risk tolerance depends on age, goals, and emotional comfort with volatility."",
                            ""interactive"":{""type"":""slider"",""question"":""Rate your risk tolerance (1-10)"",""explanation"":""Higher scores suit younger investors with long time horizons""}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Portfolio Construction & Risk",
                Description = "Building and maintaining a diversified portfolio",
                Order = 6,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Asset Allocation"",
                            ""content"":""Determine your mix of stocks, bonds, and cash based on goals and risk tolerance. Rule of thumb: 100 - age = stock percentage."",
                            ""interactive"":{""type"":""allocation"",""age"":30,""stocks"":70,""bonds"":30}
                        },
                        {
                            ""title"":""Diversification"",
                            ""content"":""Don't put all eggs in one basket. Diversify across asset classes, sectors, geographies, and investment styles to reduce risk."",
                            ""interactive"":{""type"":""diversification"",""portfolio"":[""Tech stocks only"",""Mixed US stocks"",""Global stocks + bonds""],""risk_level"":[9,5,3]}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Retirement & Tax-Advantaged Accounts",
                Description = "Using accounts to accelerate long-term wealth",
                Order = 7,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Account Types"",
                            ""content"":""401(k): employer-sponsored, pre-tax contributions. Roth IRA: after-tax contributions, tax-free growth. Traditional IRA: pre-tax contributions, taxable withdrawals."",
                            ""interactive"":{""type"":""benefits"",""accounts"":[{""name"":""401(k)"",""tax_advantage"":""Pre-tax contributions""},{""name"":""Roth IRA"",""tax_advantage"":""Tax-free growth""}]}
                        },
                        {
                            ""title"":""Employer Match"",
                            ""content"":""Free money! Contribute at least enough to get the full employer match - it's an immediate 50-100% return on your investment."",
                            ""interactive"":{""type"":""match_calculator"",""employer_match"":50,""max_match"":6,""salary"":50000,""contribution"":3,""result"":""You should contribute 6% to get full match""}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Taxes 101 (Personal Finance Focus)",
                Description = "How taxes affect take-home pay and investing",
                Order = 8,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Tax Basics"",
                            ""content"":""Progressive tax system: higher income = higher rates. Marginal rate is what you pay on your last dollar. Effective rate is what you actually pay."",
                            ""interactive"":{""type"":""tax_calculator"",""income"":75000,""filing_status"":""single"",""result"":{""marginal_rate"":22,""effective_rate"":15,""take_home"":63750}}
                        },
                        {
                            ""title"":""Tax-Advantaged Investing"",
                            ""content"":""Tax-loss harvesting: sell losing investments to offset gains. Municipal bonds: tax-exempt interest. Retirement accounts grow tax-deferred."",
                            ""interactive"":{""type"":""strategy"",""situation"":""You have $10k in gains and $3k in losses"",""action"":""Tax-loss harvest to offset gains""}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Insurance & Risk Management",
                Description = "Protecting income, assets, and liabilities",
                Order = 9,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Essential Coverages"",
                            ""content"":""Health insurance for medical costs, auto insurance for vehicle damage/liability, homeowners/renters for property and liability protection."",
                            ""interactive"":{""type"":""coverage_quiz"",""scenarios"":[{""situation"":""Car accident"",""coverage"":""Auto insurance""},{""situation"":""House fire"",""coverage"":""Homeowners insurance""}]}
                        },
                        {
                            ""title"":""Deductibles & Premiums"",
                            ""content"":""Higher deductibles = lower premiums but more out-of-pocket costs when you need coverage. Choose based on your emergency fund and risk tolerance."",
                            ""interactive"":{""type"":""tradeoff"",""high_deductible"":{""premium"":800,""out_of_pocket"":2000},""low_deductible"":{""premium"":1200,""out_of_pocket"":500}}}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Asset Ownership (Real Estate, Vehicles, Business, Equity Comp)",
                Description = "Big-ticket assets and ownership structures",
                Order = 10,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Buy vs Rent"",
                            ""content"":""Buy if you'll stay 5+ years, have stable income, and can afford maintenance/taxes. Rent if you need flexibility or have uncertain future plans."",
                            ""interactive"":{""type"":""decision_tree"",""factors"":[""Time horizon"",""Financial stability"",""Maintenance willingness""],""recommendation"":""Buy if all factors align""}
                        },
                        {
                            ""title"":""Vehicle Ownership"",
                            ""content"":""Total cost of ownership includes purchase price, insurance, maintenance, fuel, and depreciation. Consider reliability over luxury features."",
                            ""interactive"":{""type"":""tco_calculator"",""car_price"":25000,""insurance"":1200,""maintenance"":800,""fuel"":2000,""years"":5,""result"":35000}}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Financial Planning & Life Events",
                Description = "Holistic planning across milestones",
                Order = 11,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""SMART Goals"",
                            ""content"":""Specific, Measurable, Achievable, Relevant, Time-bound. Break big goals into smaller milestones with specific deadlines and action steps."",
                            ""interactive"":{""type"":""goal_builder"",""template"":""By [date], I will [specific action] to achieve [measurable goal] because [relevance]""}
                        },
                        {
                            ""title"":""Estate Planning Basics"",
                            ""content"":""Will: who gets your assets. Power of Attorney: who makes decisions if you're incapacitated. Healthcare directive: your medical wishes. Beneficiaries on accounts."",
                            ""interactive"":{""type"":""documents"",""required"":[""Will"",""Power of Attorney"",""Healthcare Directive""],""optional"":[""Trust"",""Life Insurance""]}
                        }
                    ]
                }"
            },
            new FinancialModule
            {
                Title = "Fraud, Consumer Rights & Behavioral Finance",
                Description = "Protecting yourself and making better money decisions",
                Order = 12,
                Content = @"{
                    ""sections"":[
                        {
                            ""title"":""Common Scams"",
                            ""content"":""Phishing emails, fake IRS calls, romance scams, investment fraud. Never give personal info to unsolicited requests. Verify before acting."",
                            ""interactive"":{""type"":""scenario"",""situation"":""Email claiming you're owed money"",""red_flags"":[""Unsolicited"",""Urgency"",""Requests personal info""],""action"":""Delete and report""}
                        },
                        {
                            ""title"":""Behavioral Biases"",
                            ""content"":""Loss aversion: fear of loss > joy of gain. Overconfidence: overestimating knowledge. Present bias: prioritizing today over tomorrow. Awareness helps better decisions."",
                            ""interactive"":{""type"":""bias_identification"",""examples"":[{""bias"":""I check my portfolio 5x daily"",""type"":""Overconfidence""},{""bias"":""I avoid selling losers"",""type"":""Loss aversion""}]}
                        }
                    ]
                }"
            }
        };

        _context.FinancialModules.AddRange(modules);
        _context.SaveChanges();
    }
}
