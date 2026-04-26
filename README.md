## 📄 PROJECT\_MANIFEST: KiasuCode v2.2

**"The Senior Pair Programmer for your Academic Build"**

🟢 **Status:** Stable | 🔵 **Environment:** Production (Cloud) | 🧪 **Staging:** Enabled

🟦 **Built With:** TypeScript, Telegraf | 🟠 **Database:** MySQL (Railway)

---

### 🚀 OVERVIEW

KiasuCode is a production-grade Telegram bot architected to streamline academic grade tracking for students in Singapore. Developed with a "Senior Dev" persona, it guides users through their academic deployment cycle using a hybrid of Singlish and developer jargon.

Unlike traditional calculators, KiasuCode uses a **Branching Architecture**. Records are separated by school, year, and semester to prevent data pollution. Version 2.2 introduces the **Staging Environment**, allowing students to simulate "what-if" scenarios for ongoing modules without affecting their permanent production records.

---

### 🏛️ TECHNICAL IMPLEMENTATION DETAILS

* **Staging vs. Production Isolation:** The system utilizes a dual-table strategy. Real grades are committed to `module_grades` (Production), while simulations are cached in `module_components` (Staging). This ensures that "agak-agak" math never corrupts the user's actual CGPA "Source of Truth."
* **Interactive Confirmation Handlers:** For destructive actions (like `/flush`), the bot implements a `callback_query` listener with an inline keyboard. This provides a "Senior Dev" safety net, calculating a pre-deletion summary (points and weightage at risk) before allowing the user to purge data.
* **Targeted "Dev-Lingua" Utility:** Personality logic is encapsulated in a `replyWithFlavor` utility. This allows the bot to maintain a consistent persona across different response states (Success, Error, Casual) without bloating command logic.
* **SGT Timezone Synchronization:** Leveraging the `Intl.DateTimeFormat` API, all logs and reports are synced to **Singapore Standard Time (SGT)**, regardless of where the cloud server is hosted.
* **Data Integrity & Fallbacks:** Employs `UPSERT` logic for profile persistence and automated fallbacks for Telegram users without set handles, ensuring 100% user capture.

---

### 🎯 KEY FEATURES

* 🧪 **Staging Engine (**`/agak_agak`**):** A simulation sandbox. Forecast required exam marks by logging individual components (quizzes, projects) with custom weightage.
* 🌿 **Branching Architecture (**`/checkout`**):** Isolate data by academic context (e.g., NYP Y1 S1) to maintain repository cleanliness.
* 📈 **Chiong Projection Engine (**`/chiong`**):** Dynamic "Error Budget" calculator. Know exactly how many B's or C's you can afford while staying on track for your target CGPA.
* 🚽 **Cache Management (**`/flush`**):** Clear simulation data with a single command. Includes an "Abort" logic for safety.
* 🛠️ **Interactive Hotfixes (**`/patch`**):** Real-time editing of production module codes, names, or grades via inline buttons.
* 📊 **Dynamic GPA Engine:** Automated weighted average calculations that correctly exclude Pass/Fail (P/S/U) modules from the denominator.
* 💊 **Copium Simulator (**`/copium`**):** High-velocity motivation injection for when the build feels like it's failing.

---

### 📁 PROJECT\_STRUCTURE

* `src/index.ts`: Entry point; registers commands and global callback listeners.
* `src/commands/agak_agak.ts`: Core simulation logic and the `/salah` undo handler.
* `src/commands/flush.ts`: Destructive action handler with interactive UI components.
* `src/database/`: MySQL connection pooling and optimized CRUD query logic.
* `src/middleware/`: Dev-Lingua personality injection and response flavoring.
* `src/types/`: Shared TypeScript interfaces ensuring strict type-safety across the build.

---

### 🛠️ COMMAND REFERENCE

**Production Ops**

* `/checkout <SCH> <YR> <SEM>`: Switch the active branch.
* `/commit <CODE> <CR> <GR> <NAME>`: Deploy a new grade to production.
* `/patch <CODE>`: Open the hotfix menu for a specific module.
* `/gpa` | `/logs`: Fetch Build Status and full commit history.

**Staging Ops (Simulation)**

* `/agak_agak <MOD> <NAME> <SCORE> <WT%> [TARGET%]`: Forecast targets for a specific module.
* `/salah <MOD>`: Quick "Undo" for the last component entered in staging.
* `/flush <MOD> | --all`: Purge the staging cache (Interactive).

**Dev Tools**

* `/chiong <CR_LEFT> <TARGET>`: Calculate safety margin budget.
* `/lobang`: Pull the Developer Manual (Help).

---

### 📈 RECENT UPDATES (v2.2)

* **Feature:** Launched **Staging Environment** for component-level forecasting.
* **UX:** Implemented **Interactive Flush Confirmation** with pre-deletion summaries.
* **Logic:** Added **Salah (Undo)** command to pop the last entry off the staging stack.
* **Refactor:** Decoupled simulation logic from production commands for better maintainability.

---

### 🚀 AUTHOR & PHILOSOPHY

**Developed by Felicia Tan** 

KiasuCode is about more than just the math—it's about the vibes.

* **Build Status:** STABLE
* **Merge Conflicts:** ZERO
* **GPA:** Chiong-ing 🚀