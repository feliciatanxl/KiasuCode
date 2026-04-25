# 🚀 KiasuCode v2.0: The Multi-Tenant GPA Tracker

> A high-performance Telegram bot that manages academic "repositories" with a **Dev-Lingua** personality (Singaporean Singlish + Developer Jargon).

**Build Status:** `STABLE ✅` | **Environment:** `PRODUCTION`

---

## 🎯 Project Overview

**KiasuCode** is a professional-grade transcript management system built for students who need to track academic progress across different institutions (Polytechnic, University, etc.) without data pollution. It treats each semester like a git branch, allowing for precise data isolation and weighted GPA calculations.

### ✨ Key Features
* **Branching Architecture (`/checkout`):** Isolate data by School, Year, and Semester. Keep NYP grades distinct from future degree modules.
* **Interactive Hotfixes (`/patch`):** A custom inline-button UI for live-editing module codes, names, or grades without manual database intervention.
* **Dynamic GPA Engine:** Mathematically handles **"P" (Pass/Fail) modules** by excluding them from the GPA denominator while accurately reflecting total credit counts.
* **Drill-Down Explorer (`/kaypoh`):** View global CGPA or zoom into a specific branch (e.g., `NYP Y1 S1`) to see localized semester performance.
* **Personality Middleware:** A global Telegraf interceptor that injects **Dev-Lingua** (Singlish + Dev Slang) into every response for a unique UX.

---

## 🤖 Technical Stack & Architecture

### 1. **Data Isolation Layer (MySQL)**
Utilizes a relational MySQL schema with asynchronous connection pooling via `mysql2/promise`. The architecture supports multi-tenant data structures, enabling complex queries for weighted GPA calculation across specific institution branches.

### 2. **Type-Safe Development**
The entire codebase is built with strict TypeScript interfaces (`ModuleGrade`, `StudentProfile`) to ensure data integrity across the ingestion and patching pipelines.

### 3. **The "Dev-Lingua" Pipeline**
Instead of hardcoding strings, a custom middleware wraps `ctx.reply()` globally. This injects random "flavor text" from a central library, keeping the command handlers focused strictly on business logic.

---

## 📁 Repository Structure

```
KiasuCode/
├── src/
│   ├── index.ts           # Entry point - registers commands & middleware
│   ├── commands/          # Command handlers (The "Business Logic")
│   │   ├── checkout.ts    # Branch switching logic
│   │   ├── commit.ts      # Data ingestion (New grades)
│   │   ├── kaypoh.ts      # Search engine & filtered history
│   │   └── patch.ts       # Interactive UI for hotfixes
│   ├── database/          # Persistence Layer
│   │   ├── connection.ts  # Connection pooling
│   │   └── queries.ts     # Data-aware search & CRUD operations
│   ├── middleware/        # Personality injection & logging
│   └── types/             # Single source of truth for interfaces
├── .env                   # Secrets & DB credentials
└── package.json           # Scripts & dependencies
```

### 🚀 Getting Started
Prerequisites
Node.js 20+

MySQL Server (Local or Cloud)

Telegram Bot Token (via @BotFather)

Installation
# 1. Clone the repository
git clone [https://github.com/yourusername/KiasuCode.git](https://github.com/yourusername/KiasuCode.git)

# 2. Install dependencies
npm install

# 3. Configure the environment
cp .env.example .env

# 4. Launch the development build
npm run dev

### 🛠️ Developer Manual (Lobang)
Command	Action	Example
/checkout	    Switch active school/year/sem	                /checkout NYP Y1 S1
/commit	        Deploy a new grade to the branch	            /commit IT1111 4 A Applied Math
/kaypoh	        Explore the repository (Overview or Filtered)	/kaypoh NYP Y1
/patch	        Open interactive hotfix menu	                /patch IT1111

### ✍️ AI-Assisted Engineering
As the Technical Lead, I leveraged LLMs for rapid prototyping and boilerplate scaffolding. The core Multi-School Logic, Dynamic GPA Math, and Middleware Interceptors were manually engineered and audited to ensure production-level quality and data isolation.

Developed by: Me
Project Status: Shipped & Steady! 💪