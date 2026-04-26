## KiasuCode v2.0 🚀

A Telegram bot for tracking academic progress across multiple schools, years, and semesters — with a unique Dev-Lingua personality combining Singlish and developer slang 🤖💬

🟢 Status: Stable 

🔵 Environment: Production (Cloud) 

🟦 Built With: TypeScript, Telegraf 

🟠 Database: MySQL (Railway)

━━━━━━━━━━━━━━━━━━

### Overview

KiasuCode is a transcript and GPA tracking bot built for students who want to manage academic records across different institutions without mixing data together.

Instead of dumping everything into one messy system, KiasuCode uses a branch-like structure to separate records by school, year, and semester. This makes it easier to track progress accurately, calculate weighted GPA properly, and avoid data pollution.

━━━━━━━━━━━━━━━━━━

### Key Features

🌿 Branching Architecture (/checkout) Switch between different academic contexts such as NYP Y1 S1 or future university semesters.

🎯 Chiong Projection Engine (/chiong) Dynamically calculates your grade "Error Budget" to tell you exactly how many B's or C's you can afford while still hitting your target CGPA.

🛠️ Interactive Hotfixes (/patch) Edit module codes, names, or grades through inline buttons without touching the database manually.

📊 Dynamic GPA Engine Correctly handles Pass/Fail (P) modules by excluding them from GPA calculations while still counting total credits.

🕵️ Drill-Down Explorer (/kaypoh) View overall CGPA or inspect a specific branch to see localized semester performance.

🗣️ Dev-Lingua Personality Layer Adds Singlish + developer-style flavor text to bot responses for a more distinctive and fun user experience.

━━━━━━━━━━━━━━━━━━

### Architecture

🗄️ 1. Data Isolation Layer Uses MySQL with mysql2/promise for asynchronous queries and connection pooling. This allows the bot to:

* Separate records by institution and semester
* Support weighted GPA calculations
* Avoid data pollution across branches

🧩 2. Type-Safe Development Built with TypeScript using strict interfaces such as ModuleGrade and StudentProfile. This improves maintainability and reduces runtime mistakes.

🎭 3. Personality Middleware A custom middleware wraps ctx.reply() globally and injects random Dev-Lingua flavor text. This keeps command handlers focused on logic while preserving a fun and consistent bot personality.

━━━━━━━━━━━━━━━━━━

### Project Structure

```css
KiasuCode/
┣ src/
┃ ┣ index.ts — Entry point, registers commands and middleware
┃ ┣ commands/
┃ ┃ ┣ checkout.ts — Branch switching logic
┃ ┃ ┣ commit.ts — Add new grades
┃ ┃ ┣ chiong.ts — Safety margin projection calculator
┃ ┃ ┣ kaypoh.ts — Search and filtered history
┃ ┃ ┣ lobang.ts — Developer manual & help UI
┃ ┃ ┣ drop.ts — Delete modules
┃ ┃ ┗ patch.ts — Interactive edit workflow
┃ ┣ database/
┃ ┃ ┣ connection.ts — MySQL connection pooling
┃ ┃ ┗ queries.ts — CRUD and filtered queries
┃ ┣ middleware/ — Personality injection and logging
┃ ┗ types/ — Shared TypeScript interfaces
┣ .env — Secrets and database credentials
┗ package.json — Scripts and dependencies
```

━━━━━━━━━━━━━━━━━━

### Getting Started

✅ Prerequisites

* Node.js 20+
* MySQL Server
* Telegram Bot Token from BotFather

⚙️ Installation

1. Clone the repository
2. Move into the project folder
3. Install dependencies
4. Configure environment variables in .env
5. Start development mode

🔗 Repository URL [https://github.com/feliciatanxl/KiasuCode]

━━━━━━━━━━━━━━━━━━

### Commands

📌 /checkout Switch active school, year, and semester Example: /checkout NYP Y1 S1

📌 /commit Add a new grade to the active branch Example: /commit IT1111 4 A Applied Math

📌 /chiong \<CREDITS\_LEFT> \<TARGET\_CGPA> Calculate the safety margin needed to hit your target. Example: /chiong 20 3.7

📌 /kaypoh \[SCHOOL] \[YEAR] \[SEM] View GPA summary or filtered records Example: /kaypoh NYP Y1

📌 /patch Open interactive edit menu to hotfix a grade Example: /patch IT1111

📌 /drop Rollback/remove a module from your active branch. Example: /drop IT1111

📌 /gpa Fetch instant CGPA and module count for your current school.

📌 /lobang Displays the KiasuCode Developer Manual.

━━━━━━━━━━━━━━━━━━

### Engineering Notes

This project was developed with AI-assisted prototyping for faster iteration and scaffolding.

Core logic successfully designed, refined, and validated for production:

* Multi-school branch isolation and GPA rules
* Upsert (INSERT ... ON DUPLICATE KEY UPDATE) state management
* Live schema migrations and strict MySQL handling (VARCHAR truncation, PK rules)
* Middleware-based response injection

━━━━━━━━━━━━━━━━━━

### Project Status

Shipped and steady lah 💪

Currently live in production and fully functional. Successfully deployed to cloud infrastructure via Railway with a connected remote MySQL instance.

Room for future enhancements:

* 🔔 Reminder workflows
* 🔗 FocusFlow integration

━━━━━━━━━━━━━━━━━━

Author

Developed by Felicia Tan

⭐ If you like this project, give it a star on GitHub.