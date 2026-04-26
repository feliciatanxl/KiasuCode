## 📄 PROJECT\_MANIFEST: KiasuCode v2.1

**"The Senior Pair Programmer for your Academic Build"**

🟢 **Status:** Stable | 🔵 **Environment:** Production (Cloud)

🟦 **Built With:** TypeScript, Telegraf | 🟠 **Database:** MySQL (Railway)

---

### 🚀 OVERVIEW

KiasuCode is a production-grade Telegram bot architected to streamline academic grade tracking for students in Singapore. Developed with a "Senior Dev" persona, it guides users through their academic deployment cycle using a hybrid of Singlish and developer jargon.

Unlike traditional calculators, KiasuCode uses a **Branching Architecture**. Instead of one messy list, records are separated by school, year, and semester. This prevents data pollution, ensures weighted GPA accuracy, and allows students to manage transitions (e.g., Poly to University) within a single repository.

---

### 🏛️ TECHNICAL IMPLEMENTATION DETAILS

This project highlights technical maturity through several key architectural decisions:

* **Targeted "Dev-Lingua" Utility:** Originally a global middleware, the personality layer was refactored into a targeted utility function (`replyWithFlavor`). This prevents state conflicts (like the "Double Wah Lau" bug) and ensures context-aware messaging for "Success," "Error," and "Casual" states.
* **Robust Data Integrity:** Implemented a fail-safe onboarding logic. Since Telegram usernames are optional, the system automatically falls back to `first_name` or a generic "Student" identifier, ensuring 100% user capture without null values.
* **SGT Timezone Synchronization:** To solve cloud server timezone discrepancies, the system leverages the `Intl.DateTimeFormat` API to sync all user reports to **Singapore Standard Time (SGT)**.
* **State Management:** Utilizes `UPSERT` logic (`INSERT ... ON DUPLICATE KEY UPDATE`) to ensure student profiles and active branches are always in sync with the latest user interaction.

---

### 🎯 KEY FEATURES

* 🌿 **Branching Architecture (**`/checkout`**):** Switch between academic contexts (e.g., NYP Y1 S1) to keep data isolated.
* 📈 **Chiong Projection Engine (**`/chiong`**):** Dynamically calculates your "Error Budget"—telling you exactly how many B's or C's you can afford while hitting your target CGPA.
* 🛠️ **Interactive Hotfixes (**`/patch`**):** Edit module codes, names, or grades through inline buttons.
* 📊 **Dynamic GPA Engine:** Correctly handles Pass/Fail (P/S/U) modules by excluding them from GPA denominators while still counting total credits.
* 🕵️ **Drill-Down Explorer (**`/kaypoh`**):** Audit full global history or inspect specific semesters for localized performance.
* 💊 **Copium Simulator (**`/copium`**):** Forecast your final GPA by simulating "Dream Build" scenarios.

---

### 📁 PROJECT STRUCTURE

* `src/index.ts`: Entry point, registers commands and error handling.
* `src/commands/`: Individual modules for `/checkout`, `/commit`, `/chiong`, `/kaypoh`, etc.
* `src/database/`: MySQL connection pooling and CRUD query logic.
* `src/middleware/`: Dev-Lingua personality injection and response flavoring.
* `src/types/`: Shared TypeScript interfaces for strict type-safety.

---

### 🛠️ COMMAND REFERENCE

* `/start`: Initialize repository and capture profile data.
* `/checkout <SCH> <YR> <SEM>`: Switch the active branch.
* `/commit <CODE> <CR> <GR> <NAME>`: Deploy a new grade to the active branch.
* `/kaypoh [SCH] [YR] [SEM]`: View filtered build history.
* `/patch <CODE>`: Open the hotfix menu for a specific module.
* `/chiong <CR_LEFT> <TARGET>`: Calculate your safety margin budget.
* `/gpa`: Fetch instant Build Status and CGPA.
* `/lobang`: Pull the Developer Manual (Help).

---

### 📈 RECENT UPDATES (v2.1)

* **Feature:** Integrated `/start` onboarding flow for immediate profile persistence.
* **Fix:** Refactored middleware to utility function to prevent response duplication.
* **Optimization:** Synchronized all bot timestamps to `Asia/Singapore` timezone.
* **Security:** Implemented type-safe validation for all incoming command arguments.

---

### 🚀 AUTHOR & PHILOSOPHY

**Developed by Felicia Tan** 

KiasuCode is about more than just the math—it's about the vibes.

* **Build Status:** STABLE
* **Merge Conflicts:** ZERO
* **GPA:** Chiong-ing