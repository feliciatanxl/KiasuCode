## 📄 PROJECT\_MANIFEST: KiasuCode v2.3

**"The Senior Pair Programmer for your Academic Build"**

**🟢 Status:** Stable | **🔵 Environment:** Production (Cloud) | **🧪 Staging:** Pipeline Reporting Enabled

**🟦 Built With:** TypeScript, Telegraf | **🟠 Database:** MySQL (Railway)

---

### 🚀 OVERVIEW

KiasuCode is a production-grade Telegram bot architected to streamline academic grade tracking for students in Singapore. Developed with a **"Senior Dev"** persona, it guides users through their academic deployment cycle using a hybrid of Singlish and developer jargon.

Unlike traditional calculators, KiasuCode uses a **Branching Architecture**. Records are separated by school, year, and semester to prevent data pollution. Version 2.3 introduces the **Pipeline Analysis Engine**, allowing students to not only simulate grades but also "spill the tea" on exactly what percentage is required to hit their targets.

---

### 🏛️ TECHNICAL IMPLEMENTATION DETAILS

* **Pipeline Analysis Engine:** The system calculates real-time "Required Maintenance Targets." By comparing **Secured Points** in staging against a **Target Grade**, the bot determines the exact percentage needed on the remaining weightage.
* **Slack Margin Logic:** The `/chiong` command features a stress-test algorithm that measures the "Error Budget." It visualizes the safety margin using a Slack Meter, helping users identify if they are in the **High Margin** (safe) or **Danger Zone** (critical).
* **Staging vs. Production Isolation:** Real grades are committed to `module_grades` (Production), while simulations are cached in `module_components` (Staging). This ensures that "agak-agak" math never corrupts the user's actual CGPA "Source of Truth."
* **Interactive Confirmation Handlers:** For destructive actions (like `/flush`), the bot implements a `callback_query` listener with an inline keyboard. It calculates a pre-deletion summary of points and weightage at risk before execution.
* **Type-Safe Casting:** Implements strict `Number()` casting for all MySQL decimal returns. This prevents "Brain.exe" runtime errors during `.toFixed()` operations caused by database driver type-mismatching.

---

### 🎯 KEY FEATURES

* 🧪 **Staging Engine (**`/agak_agak`**):** A simulation sandbox. Forecast required exam marks by logging individual components (quizzes, projects) with custom weightage.
* ☕ **Pipeline Reporting (**`/spill`**):** Pull up the "Receipts." View every individual commit in a module's staging history alongside a target analysis and a CGPA summary.
* 📈 **Chiong Stress Test (**`/chiong`**):** A high-pressure projection engine. Know exactly how much you can slack before your target becomes mathematically impossible.
* 🌿 **Branching Architecture (**`/checkout`**):** Isolate data by academic context (e.g., NYP Y1 S1) to maintain repository cleanliness.
* 🚽 **Cache Management (**`/flush`**):** Purge the staging cache for a specific module or the entire system. Includes interactive safety confirmation.
* 🛠️ **Interactive Hotfixes (**`/patch`**):** Real-time editing of production module records via inline button menus.
* 📊 **Dynamic GPA Engine:** Automated weighted average calculations that correctly exclude Pass/Fail (P/S/U) modules from the denominator.

---

### 📁 PROJECT\_STRUCTURE

* `src/index.ts`: Entry point; registers commands and global callback listeners.
* `src/commands/agak_agak.ts`: Core simulation logic and the `/salah` undo handler.
* `src/commands/spill.ts`: Pipeline reporting logic; generates the "Receipt" and target analysis.
* `src/commands/chiong.ts`: Stress testing and "Slack Meter" visualization logic.
* `src/commands/flush.ts`: Destructive action handler with interactive UI components.
* `src/database/`: MySQL connection pooling and optimized CRUD query logic.
* `src/middleware/`: Dev-Lingua personality injection and response flavoring.

---

### 🛠️ COMMAND REFERENCE

**Production Ops**

* `/checkout <SCH> <YR> <SEM>`: Switch the active repository branch.
* `/commit <CODE> <CR> <GR> <NAME>`: Deploy a new grade to production.
* `/patch <CODE>`: Open the hotfix menu for a specific module.
* `/gpa`: Fetch the current Production CGPA status.

**Staging Ops (Simulation)**

* `/agak_agak <MOD> <NAME> <SCORE> <WT%> [TARGET%]`: Forecast targets for a module.
* `/spill <MOD> [TARGET]`: View full commit history, target analysis, and CGPA summary.
* `/chiong <MOD> [TARGET]`: Stress test your target and view the Slack Meter.
* `/salah <MOD>`: Quick "Undo" for the last component entered in staging.
* `/flush <MOD> | --all`: Purge the staging cache (Interactive).

**Dev Tools**

* `/lobang`: Pull the Developer Manual (v2.3) for full documentation.

---

### 📈 RECENT UPDATES (v2.3)

* **Feature:** Launched **Pipeline Reporting** (`/spill`) to provide detailed "Receipts" of simulations.
* **Logic:** Added **Slack Margin Analysis** to the `/chiong` command for better stress testing.
* **UX:** Integrated **CGPA Summary** directly into staging reports for "Big Picture" tracking.
* **Stability:** Fixed **MySQL Type Collision** bugs by wrapping database returns in Number constructors.

---

### 🚀 AUTHOR & PHILOSOPHY

**Developed by Felicia Tan**

KiasuCode is built on the philosophy that your academic progress should be managed like a production codebase—with transparency, version control, and zero merge conflicts.

* **Build Status:** STABLE
* **Deployment:** RAILWAY
* **GPA:** Chiong-ing 🚀