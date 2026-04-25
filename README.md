## KiasuCode v2.0 🚀

A Telegram bot for tracking academic progress across multiple schools, years, and semesters — with a unique Dev-Lingua personality combining Singlish and developer slang 🤖💬

🟢 Status: Stable
🔵 Environment: Production
🟦 Built With: TypeScript
🟠 Database: MySQL

━━━━━━━━━━━━━━━━━━

### 🎯 Overview

KiasuCode is a transcript and GPA tracking bot built for students who want to manage academic records across different institutions without mixing data together.

Instead of dumping everything into one messy system, KiasuCode uses a branch-like structure to separate records by school, year, and semester. This makes it easier to track progress accurately, calculate weighted GPA properly, and avoid data pollution.

━━━━━━━━━━━━━━━━━━

### ✨ Key Features

🌿 Branching Architecture (/checkout)
Switch between different academic contexts such as NYP Y1 S1 or future university semesters.

🛠️ Interactive Hotfixes (/patch)
Edit module codes, names, or grades through inline buttons without touching the database manually.

📊 Dynamic GPA Engine
Correctly handles Pass/Fail (P) modules by excluding them from GPA calculations while still counting total credits.

🕵️ Drill-Down Explorer (/kaypoh)
View overall CGPA or inspect a specific branch to see localized semester performance.

🗣️ Dev-Lingua Personality Layer
Adds Singlish + developer-style flavor text to bot responses for a more distinctive and fun user experience.

━━━━━━━━━━━━━━━━━━

### 🏗️ Architecture

🗄️ 1. Data Isolation Layer
Uses MySQL with mysql2/promise for asynchronous queries and connection pooling.

This allows the bot to: 

* separate records by institution and semester
* support weighted GPA calculations
* avoid data pollution across branches

🧩 2. Type-Safe Development
Built with TypeScript using strict interfaces such as: 

* ModuleGrade
* StudentProfile

This improves maintainability and reduces runtime mistakes.

🎭 3. Personality Middleware
A custom middleware wraps ctx.reply() globally and injects random Dev-Lingua flavor text.

This keeps command handlers focused on logic while preserving a fun and consistent bot personality.

━━━━━━━━━━━━━━━━━━

### 📁 Project Structure
```
KiasuCode/
┣ src/
┃ ┣ index.ts — Entry point, registers commands and middleware
┃ ┣ commands/
┃ ┃ ┣ checkout.ts — Branch switching logic
┃ ┃ ┣ commit.ts — Add new grades
┃ ┃ ┣ kaypoh.ts — Search and filtered history
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

### 🚀 Getting Started

✅ Prerequisites • Node.js 20+
• MySQL Server
• Telegram Bot Token from BotFather

⚙️ Installation

1. Clone the repository
2. Move into the project folder
3. Install dependencies
4. Configure environment variables
5. Start development mode

🔗 Repository URL
[**https://github.com/feliciatanxl/KiasuCode**](https://github.com/feliciatanxl/KiasuCode)

━━━━━━━━━━━━━━━━━━

### ⚡ Commands

📌 /checkout
Switch active school, year, and semester
Example: /checkout NYP Y1 S1

📌 /commit
Add a new grade to the active branch
Example: /commit IT1111 4 A Applied Math

📌 /kaypoh
View GPA summary or filtered records
Example: /kaypoh NYP Y1

📌 /patch
Open interactive edit menu
Example: /patch IT1111

━━━━━━━━━━━━━━━━━━

### 🧠 Engineering Notes

This project was developed with AI-assisted prototyping for faster iteration and scaffolding.

Core logic such as: 

* multi-school branch isolation
* GPA calculation rules
* pass/fail handling
* middleware-based response injection

Was manually designed, refined, and validated during development.

━━━━━━━━━━━━━━━━━━

### 📌 Project Status

Shipped and steady lah 💪

Currently stable and functional, with room for future enhancements such as: ☁️ cloud deployment
🕒 24/7 bot uptime
🔔 reminder workflows
🔗 FocusFlow integration

━━━━━━━━━━━━━━━━━━

👨‍💻 Author

Developed by Felicia Tan

⭐ If you like this project, give it a star on GitHub.