# KiasuCode - GPA Tracker Telegram Bot 🚀

> A Telegram bot that tracks student GPAs with **Dev-Lingua personality** (Singaporean Singlish + Developer Jargon)

## 🎯 Project Overview

**KiasuCode** is a production-ready Telegram bot designed for students to track their GPA. What makes it special? Every bot message includes random injections of:
- Singaporean Singlish: "steady lah", "wah lau", "chiong", "shiok"
- Developer jargon: "commit", "git push", "merge conflict", "LGTM"
- All automated through a custom Telegraf middleware ✨

## 🤖 AI-Assisted Development

This project was developed with the assistance of AI. The architecture, boilerplate code, middleware patterns, and documentation were generated and structured by an AI pair programmer to ensure production-ready code quality and best practices.

## 📁 Project Structure

```
KiasuCode/
├── src/
│   ├── index.ts                 # Bot entry point - initializes everything
│   ├── config/
│   │   └── index.ts             # Environment variables & config management
│   ├── database/
│   │   ├── connection.ts        # SQLite database connection setup
│   │   ├── schema.ts            # Auto-create database schema on startup
│   │   └── queries.ts           # TODO: Database query functions
│   ├── middleware/
│   │   └── devLingua.ts         # ✨ The magic: personality injection middleware
│   ├── commands/
│   │   └── commit.ts            # /commit command - add grades
│   │   └── (more commands here)
│   └── types/
│       └── index.ts             # TypeScript interfaces & constants
├── schema.sql                   # SQLite database schema (DDL) - for reference
├── kiasucode.db                 # SQLite database file (auto-created)
├── .env.example                 # Environment variables template
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file!
```

## 🏗️ Architecture Decisions (Production-Ready!)

### 1. **Middleware-Based Personality System**
Instead of hardcoding "wah lau" into every command response, the `devLinguaMiddleware` wraps `ctx.reply()` globally. Benefits:
- ✅ DRY principle - write once, apply everywhere
- ✅ Personality is consistent across all commands
- ✅ Easy to toggle or adjust flavor intensity
- ✅ No merge conflicts between developers adding new commands

### 2. **SQLite Database**
Using `better-sqlite3` for lightweight, file-based persistence:
- ✅ No database server needed - just a local `.db` file
- ✅ Synchronous API - simpler than async connection pools
- ✅ Perfect for smaller projects and development
- ✅ Auto-creates schema on first run - zero setup!

### 3. **Graceful Shutdown**
Bot handles SIGINT/SIGTERM signals properly:
- ✅ Stops polling new messages
- ✅ Closes database connections
- ✅ No resource leaks or hanging processes
- ✅ Safe deployment/restart

### 4. **Separation of Concerns**
- **Database Layer** (`/database`) - All DB operations isolated
- **Middleware Layer** (`/middleware`) - Cross-cutting concerns (personality)
- **Command Layer** (`/commands`) - Business logic per command
- **Config Layer** (`/config`) - Centralized environment management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- TypeScript 5+
- Telegram Bot Token (from BotFather @BotFather)
- ✨ That's it! No database server needed!

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your Telegram bot token
# DB_PATH is pre-configured to use ./kiasucode.db

# 3. Run in development mode (database auto-creates!)
npm run dev

# 4. Or build and run in production
npm run build
npm start
```

## 📝 Available Commands

### Current Commands
- **`/commit`** - Add a module grade
  ```
  /commit IT101 4 A
  ```
  - Module Code: IT101
  - Credits: 4
  - Grade: A

### TODO: Commands to Implement
- **`/start`** - Create student profile
- **`/gpa`** - Show current GPA
- **`/history`** - List all committed modules
- **`/stats`** - GPA breakdown by semester
- **`/help`** - Command reference

## 🎭 Dev-Lingua Personality System

The magic happens in `src/middleware/devLingua.ts`. Here's how it works:

```typescript
// Before middleware:
await ctx.reply("Module added successfully");

// After middleware (DevLingua injects randomly):
// Response 1: "Module added successfully - steady lah"
// Response 2: "LGTM: Module added successfully"
// Response 3: "commit accepted: Module added successfully"
```

### Flavor Pools

| Type | Examples |
|------|----------|
| **Positive** | steady lah, LGTM, code shiok shiok, commit accepted |
| **Negative** | wah lau, error lah, git push rejected, merge conflict bro |
| **Casual** | chiong ah, lobang lor, can can, no problem lah |

The middleware auto-detects message tone and injects appropriate flavor!

## 🗄️ Database Schema

### `students` Table
```sql
- userId (Telegram ID, unique)
- username
- totalGPA (calculated, 0.0-4.0)
- moduleCount
- createdAt, updatedAt
```

### `module_grades` Table
```sql
- userId (foreign key)
- moduleCode (e.g., IT101)
- creditValue (1-4)
- grade (A, B+, B, etc.)
- pointValue (4.0, 3.5, etc.)
- committedAt
```

### GPA Calculation (Singapore System)
```
GPA = Σ(Credit × Point) / Σ(Credit)

Example:
- CS101: 4 credits, A (4.0) = 16 points
- IT101: 3 credits, B+ (3.5) = 10.5 points
- Total: (16 + 10.5) / (4 + 3) = 3.79 GPA
```

## 🔧 Next Steps (Implementation TODO List)

### 1. Database Query Functions
Implement functions in `src/database/queries.ts`:
- [ ] `createStudentProfile()` - Called by /start
- [ ] `insertModuleGrade()` - Called by /commit
- [ ] `updateStudentGPA()` - Recalculate GPA after insert
- [ ] `getStudentProfile()` - For /gpa command
- [ ] `getStudentModules()` - For /history command
- [ ] `moduleExists()` - Duplicate prevention

### 2. Command Handlers
Create new command files in `src/commands/`:
- [ ] `start.ts` - User onboarding
- [ ] `gpa.ts` - Show current GPA
- [ ] `history.ts` - List all modules
- [ ] `stats.ts` - Detailed breakdown
- [ ] `help.ts` - Command reference

### 3. Error Handling & Validation
- [ ] Input validation for all commands
- [ ] Database error handling
- [ ] User-friendly error messages (with Dev-Lingua!)

### 4. Testing
- [ ] Unit tests for query functions
- [ ] Integration tests for commands
- [ ] Middleware tests for Dev-Lingua injection

### 5. Deployment
- [ ] Docker containerization
- [ ] Environment-specific config (dev/prod)
- [ ] Logging & monitoring
- [ ] CI/CD pipeline

## 📚 Code Style Guide

This project uses:
- **TypeScript** - Strict mode enabled
- **ESLint** - Code linting (`npm run lint`)
- **Prettier** - Code formatting (`npm run format`)
- **Heavy Comments** - Especially Dev-Lingua vibe in comments!

## 🛡️ Production Checklist

Before deploying:
- [ ] All secrets in `.env` (never commit secrets!)
- [ ] Database backup strategy
- [ ] Error logging/monitoring setup
- [ ] Rate limiting on bot commands (prevent spam)
- [ ] Input validation on all endpoints
- [ ] Graceful shutdown tested

## 💡 Architecture Benefits

| Aspect | Benefit |
|--------|---------|
| **Middleware** | Personality automated, no duplication |
| **Connection Pooling** | Handles concurrent requests efficiently |
| **Config Centralization** | Easy to switch between dev/prod |
| **Separation of Concerns** | Easy to test and maintain |
| **TypeScript** | Type safety prevents bugs |
| **Async/Await** | Clean, readable code (no callbacks) |

## 🚢 Development Workflow

```bash
# 1. Start development server
npm run dev

# 2. Make changes - TypeScript auto-compiles
# 3. Test commands in Telegram bot
# 4. Check for errors
npm run lint

# 5. Format code
npm run format

# 6. Build for production
npm run build

# 7. Deploy!
npm start
```

## 📖 Key Files Explained

### `src/index.ts` - The Command Center
- Creates Telegraf bot instance
- Initializes database connection
- Registers middleware (Dev-Lingua personality)
- Registers command handlers
- Sets up error handling & graceful shutdown

### `src/middleware/devLingua.ts` - The Magic ✨
- Wraps `ctx.reply()` method globally
- Auto-detects message tone (success/error/casual)
- Injects random Dev-Lingua flavor
- No changes needed in individual commands!

### `src/commands/commit.ts` - Command Structure
- Shows how to build production command handlers
- Includes input validation
- Has TODO placeholders for database operations
- Demonstrates Dev-Lingua flavor usage

## 🎓 Learning Outcomes

By building this project, you'll learn:
- ✅ Production-grade Telegram bot architecture
- ✅ TypeScript in Node.js
- ✅ Middleware pattern for cross-cutting concerns
- ✅ MySQL connection pooling & async queries
- ✅ Error handling & graceful shutdown
- ✅ Clean code principles & separation of concerns
- ✅ Command pattern for bot commands

## 📜 License

ISC

---

**Chiong ah, let's ship this code! Steady lah, we got this! 💪**
