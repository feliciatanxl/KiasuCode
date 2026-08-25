# 🚀 KiasuCode v3.0

**Your Senior Pair Programmer for Academic Survival.**

KiasuCode is a production-grade Telegram bot built to help students track, simulate, and forecast their GPA and assignment pipelines. Designed with a robust Hub & Spoke architecture, it features granular grading scales across multiple institutions (ITE, Poly, Uni) and provides an interactive "Staging Environment" to stress-test your exam targets before the real thing.

---

### 🛠️ Tech Stack

* **Runtime:** Node.js
* **Language:** TypeScript
* **Framework:** Telegraf (Telegram Bot API)
* **Database:** MySQL (Hosted on Railway)
* **Task Scheduling:** Node-Cron (Daily Pipeline Stand-ups)

---

### ✨ Core Features (The Hub & Spoke Architecture)

With v3.0, KiasuCode utilizes interactive drill-down menus instead of flooding the user with dozens of text commands.

**1. 🎛️ Command Center (**`/dashboard`**)**

* **Instant Telemetry:** View your global or branch-specific CGPA instantly.
* **Drill-Down UI:** Interactive menus to filter your module history by School, Year, and Semester.
* **Pipeline Tracker:** View upcoming task deadlines categorized by urgency.

**2. 🛠️ Production Environment (**`/manage`**)**

* **Commit Actions:** Safely deploy module codes, credits, and grades to your active database branch.
* **Branching:** Checkout different academic semesters seamlessly.
* **Hotfixes:** Granular patching to edit specific module codes or grades without deleting the whole record.

**3. 🧪 Staging Sandbox (**`/staging`**)**

* **Agak-Agak Engine:** Forecast your final grade by logging individual quiz/assignment weightages.
* **Copium Simulator:** Project your final CGPA by simulating hypothetical straight 'A's.
* **Chiong Index:** Calculate your "Error Budget" to see exactly how many marks you can afford to lose while still hitting your target floor.

**4. 🔙 System Recovery (**`/undo`**)**

* Global Ctrl+Z functionality to undo recent commits, branch checkouts, or restore dropped modules from the recycle bin.

---

### 💻 Local Development Setup

To run KiasuCode on your local machine (e.g., using a Test Bot token) while connecting to the cloud database:

**1. Clone the repository and install dependencies:**

Bash
```css
git clone https://github.com/yourusername/KiasuCode.git
cd KiasuCode
npm install
```

**2. Configure Environment Variables:** Create a `.env` file in the root directory. _Ensure this file is listed in your&#x20;_`.gitignore`_!_

Code snippet

```css
# Telegram Bot Configuration
TELEGRAM_TOKEN=your_test_bot_token_here

# Database Configuration (Railway Public Connection)
DB_HOST=shuttle.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=your_railway_password
DB_NAME=railway
DB_PORT=17095
```

**3. Boot up the environment:**

Bash

```css
npm run dev
```

If the terminal prints `✅ MySQL Connected` and `✅ Bot is live!`, you are ready to chiong.

---

### 🚀 Production Deployment (Railway)

This bot is configured for seamless CI/CD via GitHub and Railway.

1. Ensure your `package.json` includes the production build scripts:

   JSON

   ```css
   "scripts": {
     "dev": "ts-node-dev src/index.ts",
     "build": "tsc",
     "start": "node dist/index.js"
   }
   ```

2. Set your **Production Bot Token** in the Railway Variables dashboard.

3. Push to the `main` branch. Railway will automatically build the TypeScript files and boot the worker.

---

### 📜 Philosophy & "Dev-Lingua"

KiasuCode isn't just a calculator; it's a personality. The bot utilizes a custom middleware injector that formats all responses with a mix of professional Git-Ops terminology and local Singaporean flair. Expect strict type-safety mixed with a lot of "Steady lah" and "Wah lau."