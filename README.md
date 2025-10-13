# Financial Literacy & Budgeting App

## Project Overview

The **Financial Literacy Hub** is a comprehensive web application designed to help users improve their financial literacy through interactive training modules and personalized budgeting tools. The application aims to empower users with the knowledge and tools needed to make better financial decisions and achieve financial freedom.

## 🎯 Project Goal: No Poverty

This application contributes to the UN Sustainable Development Goal of "No Poverty" by providing accessible financial education and budgeting tools to help low-income individuals and families improve their financial management skills and work towards financial stability.

## ✨ Core Features

### Financial Literacy Training Modules (12 Comprehensive Modules)

1. **Budgeting Basics** - Foundation of tracking income/expenses, budget methods (50/30/20, zero-based, envelope)
2. **Banking & Cash Management** - Account optimization, security, and fraud prevention
3. **Credit & Debt Management** - Building credit responsibly and debt reduction strategies
4. **Saving & Emergency Funds** - Building financial buffers and goal-based savings
5. **Investing Fundamentals** - Risk/return basics and investment types
6. **Portfolio Construction & Risk** - Asset allocation and diversification
7. **Retirement & Tax-Advantaged Accounts** - Using accounts for long-term wealth
8. **Taxes 101** - Personal finance tax implications
9. **Insurance & Risk Management** - Protecting income and assets
10. **Asset Ownership** - Real estate, vehicles, and major purchases
11. **Financial Planning & Life Events** - Holistic milestone planning
12. **Fraud, Consumer Rights & Behavioral Finance** - Protection and better decision-making

### Advanced Budgeting System

- **Multiple Budget Methods**: 50/30/20, Zero-based, and Envelope budgeting
- **Live Calculations**: Real-time budget adjustments with instant feedback
- **State-Specific Adjustments**: Cost-of-living and tax considerations
- **Debt Snowball Calculator**: Automated payoff timeline with interest savings
- **12-Month Projections**: Forward-looking financial planning

### Interactive Dashboard

- **Progress Tracking**: Visual progress bars for budget categories
- **Spending Analysis**: Category breakdowns and trends
- **Emergency Fund Tracking**: Savings goals and milestone progress
- **Financial Milestones**: Achievement tracking and motivation
- **Responsive Charts**: Toggle between doughnut and bar chart views

## 🛠 Technology Stack

### Backend
- **C# .NET 9** - Minimal APIs
- **Entity Framework Core** - SQLite database
- **RESTful API** - Clean, documented endpoints

### Frontend
- **Vanilla HTML5/CSS3/JavaScript** - No frameworks, pure web standards
- **Bootstrap 5.3** - Responsive UI components
- **Chart.js** - Interactive data visualizations
- **Progressive Web App Ready** - Modern web standards

## 🚀 Getting Started

### Prerequisites
- .NET 9 SDK
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Group-Project-2
   ```

2. **Start Both Servers**
   ```powershell
   # Run the PowerShell script to start both backend and frontend servers
   .\start.ps1
   ```
   The backend API server will start on `http://localhost:5267`
   The frontend will be available at `http://localhost:8000`

   **Alternative Manual Setup:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   dotnet run
   # Backend starts on http://localhost:5267

   # Terminal 2 - Frontend (choose one option)
   cd frontend
   # Option 1: Python (if installed)
   python -m http.server 8000
   # Option 2: Node.js serve (if installed)
   npx serve -l 8000
   # Option 3: .NET tool
   dotnet tool install --global dotnet-serve
   dotnet serve -p 8000
   ```


4. **Database Initialization**
   - The SQLite database (`financialapp.db`) will be created automatically
   - Initial data (categories, state parameters, modules) will be seeded

## 🔧 Troubleshooting

### Common Issues and Solutions

**Problem:** "Unable to connect to server" or "Network error" messages
**Solution:** The backend server may not be running. Make sure to run `.\start.ps1` to start both servers.

**Problem:** Login fails even with correct credentials
**Solution:** The backend server must be running on port 5267. Check if it's started correctly.

**Problem:** Nothing displays when visiting localhost:8000
**Solution:** The frontend server may not be running. Run `.\start.ps1` to start both servers.

**Problem:** "Failed to initialize application" errors
**Solution:** Check browser console for detailed error messages. Ensure all JavaScript files are loading correctly.

**Problem:** Cannot navigate between sections (Dashboard, Budget, Modules)
**Solution:** This indicates the frontend JavaScript isn't loading properly. Check browser console and ensure no JavaScript errors.

### Quick Start Commands

```powershell
# Start both servers (recommended)
.\start.ps1

# Manual backend only
cd backend
dotnet run

# Manual frontend only (choose one)
cd frontend
python -m http.server 8000
# OR
dotnet tool install --global dotnet-serve
dotnet serve -p 8000
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/referencedata/states` | GET | Get all US states with COLA data |
| `/api/referencedata/categories` | GET | Get budget categories |
| `/api/referencedata/financial-modules` | GET | Get learning modules |
| `/api/onboarding` | POST | Create user household and profile |
| `/api/budget/generate` | POST | Generate personalized budget |
| `/api/budget/{id}` | GET | Retrieve budget details |

## 📱 User Experience

### Onboarding Flow
1. **Personal Information** - Email, state, household size
2. **Income Setup** - Multiple income sources with different cadences
3. **Debt Assessment** - Current debts and payment information
4. **Goal Setting** - Financial objectives and priorities

### Dashboard Features
- **Summary Cards** - Income, budgeted, remaining, debt freedom timeline
- **Budget Visualization** - Interactive charts with toggle views
- **Progress Tracking** - Real-time budget adherence monitoring
- **Emergency Fund** - Savings goals with visual progress
- **Financial Milestones** - Achievement tracking and motivation

### Learning Experience
- **Interactive Modules** - Quizzes, calculators, drag-and-drop activities
- **Progress Tracking** - Module completion and knowledge assessment
- **Contextual Tips** - Relevant advice based on user situation
- **Mobile-Responsive** - Learn anywhere, anytime

## 🔧 Architecture

### Database Schema
```sql
-- Core entities
Users, Households, Incomes, Expenses, Debts
Goals, Budgets, BudgetItems, Transactions
Categories, StateParams, Settings
FinancialModules, UserModuleProgress
```

### Clean Architecture
- **Repository Pattern** - Data access abstraction
- **Service Layer** - Business logic separation
- **API Controllers** - RESTful endpoint management
- **Frontend Services** - API communication and state management

## 🌟 Key Features Implemented

✅ **Complete Database Schema** - SQLite with all required entities
✅ **RESTful API** - Full CRUD operations for all data
✅ **Interactive Onboarding** - Multi-step user setup process
✅ **Advanced Budgeting** - Multiple methodologies with live calculations
✅ **Debt Management** - Snowball calculator with projections
✅ **Financial Education** - 12 comprehensive interactive modules
✅ **Rich Dashboard** - Progress tracking, charts, and projections
✅ **Responsive Design** - Mobile-first, accessible interface
✅ **State-Specific Data** - COLA and tax rate integration
✅ **Accessibility** - WCAG compliance, keyboard navigation

## 🎨 Design Principles

- **User-Centered Design** - Intuitive, educational interface
- **Progressive Disclosure** - Information revealed as needed
- **Visual Hierarchy** - Clear information architecture
- **Responsive Layout** - Works on all device sizes
- **Accessibility First** - Screen reader compatible, keyboard navigable

## 📊 Sample Data

The application includes sample data for:
- **50 US States** with cost-of-living adjustments
- **Budget Categories** organized by needs/wants/savings
- **12 Financial Modules** with interactive content
- **Tax Rate Estimates** for budget calculations

## 🔮 Future Enhancements

- **Multi-user Households** - Family financial management
- **Transaction Import** - Bank account integration (Plaid API)
- **Advanced Analytics** - Spending pattern analysis
- **Mobile App** - React Native companion application
- **Gamification** - Achievement badges and streaks
- **Community Features** - Discussion forums and peer support

## 🤝 Contributing

This project demonstrates modern web development practices:
- Clean, maintainable code architecture
- Comprehensive error handling
- Responsive, accessible user interfaces
- Interactive educational content
- Real-world financial application

## 📄 License

This project is created for educational purposes as part of the "No Poverty" initiative, demonstrating practical financial literacy tools for sustainable development.

---

**Built with ❤️ for financial education and empowerment**
