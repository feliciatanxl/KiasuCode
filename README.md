# KiasuCode - GPA Tracker Telegram Bot 🚀

> A Telegram bot that tracks student GPAs with **Dev-Lingua personality** (Singaporean Singlish + Developer Jargon)

## 🎯 Project Overview

**KiasuCode** is a production-ready Telegram bot designed for students to track their GPA. Every bot message includes random injections of:
- Singaporean Singlish: "steady lah", "wah lau", "chiong", "shiok"
- Developer jargon: "commit", "git push", "merge conflict", "LGTM"
- All automated through a custom Telegraf middleware ✨

## 🤖 AI-Assisted Development

This project was developed with the assistance of AI. I acted as the Technical Lead, leveraging LLMs for rapid prototyping and boilerplate scaffolding while manually engineering the core middleware logic and database architecture to ensure production-level quality.

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


## 🏗️ Architecture Decisions

### 1. **Middleware-Based Personality System**
The `devLinguaMiddleware` wraps `ctx.reply()` globally to ensure a consistent Singlish personality without hardcoding slang into every command handler.

### 2. **MySQL Persistence Layer**
Switched to **MySQL** with asynchronous connection pooling via `mysql2/promise` for production scalability, handling concurrent user requests efficiently.

### 3. **Separation of Concerns**
Strict modularity between command logic, database queries, and persona middleware allows for easy feature chionging without merge conflicts.

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- MySQL Server (XAMPP, Docker, or Workbench)
- Telegram Bot Token

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Set up .env
cp .env.example .env
# Fill in DB_HOST, DB_USER, DB_PASSWORD, and TELEGRAM_TOKEN

# 3. Chiong the dev server
npm run dev
Chiong ah, let's ship this code! Steady lah! 💪