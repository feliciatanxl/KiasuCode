<div align="center">

# 🚀 KiasuCode

### **Ship your semester. Zero merge conflicts.**

**A Singapore-built Academic Operating System that treats student life like a production environment.**

Track your GPA. Simulate future grades. Chiong Pomodoro sessions. Raise a study pet. Watch deadlines. Manage module files. Study with friends.

All without maintaining another cursed Excel spreadsheet.

<br />

![Status](https://img.shields.io/badge/STATUS-RELEASE%20CANDIDATE-22C55E?style=for-the-badge)
![Singapore](https://img.shields.io/badge/BUILT%20IN-Singapore%20🇸🇬-EF4444?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Railway-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

<br />

[Features](#-the-kiasucode-system) •
[Architecture](#️-architecture) •
[Tech Stack](#-tech-stack) •
[Setup](#-local-development) •
[Dev-Lingua](#-dev-lingua) •
[Legacy Bot](#-where-it-started)

<br />

</div>

---

```text
$ kiasucode status

✓ academic.pipeline       RUNNING
✓ gpa.staging             SAFE
✓ deadline.radar          ARMED
✓ focus.runtime           ACTIVE
✓ pet.happiness           SHIOK
✓ telegram.reminders      CONNECTED
✓ spreadsheet.chaos       TERMINATED

> Steady lah. Semester deployment in progress.
```

---

## 🧠 What is KiasuCode?

Student life has a funny way of becoming a distributed system.

Your grades are in one portal.

Deadlines are somewhere in Teams.

Lecture slides are buried in folders.

Your timetable is another screenshot.

GPA calculations live inside a suspicious Excel sheet called:

```text
GPA_FINAL_FINAL_V3_REAL.xlsx
```

And exam week?

That's basically a production outage.

**KiasuCode brings everything into one academic command centre.**

It combines academic planning, GPA simulation, deadline tracking, focus tools, gamification, collaboration, file management and Telegram automation into one platform designed around the way Singapore students actually study.

The idea is simple:

> **Treat your semester like software. Plan it. Stage it. Test it. Then ship it.**

---

# 🎛️ Student Life, But Make It DevOps

| Student Life | KiasuCode |
|---|---|
| Semester | Release Cycle |
| Module | Branch |
| Assignment | Ticket |
| Target Grade | SLA |
| Current GPA | Production Telemetry |
| Hypothetical Grade | Staging Build |
| Completed Module | Merged |
| Deadline | Incident Timer |
| Study Session | Focus Deployment |
| Bad Result | Regression |
| Study Plan Change | Hotfix |
| Exam Week | Production Incident 🔥 |

Because sometimes saying:

> `"GPA regression detected. Initiating study-plan hotfix."`

hurts slightly less than:

> `"Walao my GPA drop again."`

---

# ✨ The KiasuCode System

KiasuCode is no longer just a GPA calculator.

It is built around several connected academic systems.

---

## 01 // 📊 Academic Command Center

### **Your semester telemetry, all in one place.**

The Dashboard acts as the main operating console for your academic life.

Track:

- Current GPA
- Target GPA
- Completed credit units
- Active modules
- Upcoming milestones
- Today's agenda
- Study activity
- Pet status
- Timetable information

Instead of opening five different apps before class:

```text
login → dashboard → everything.
```

---

## 02 // 🌿 Git-Style Module Pipeline

Modules aren't just rows in a table.

KiasuCode treats them like work moving through a development pipeline:

```text
BACKLOG
   ↓
IN PROGRESS
   ↓
MERGED ✓
```

Each module can store:

- Module code
- Module name
- Credit units
- Target grade
- Actual grade
- Semester
- Academic status
- Attached study files

Finished the module?

**Merge it.**

Taking it next semester?

**Backlog.**

Currently suffering through it?

**In Progress.**

---

## 03 // 🧪 GPA Staging Sandbox

### **Break things here, not in production.**

Want to know what happens if you score an `A` for one module and a `B+` for another?

Don't touch your real academic records.

Stage it first.

The GPA simulator allows you to create hypothetical grade scenarios and immediately compare them against your current GPA.

```text
CURRENT BUILD
GPA: 3.55

        ↓ stage grades

STAGING BUILD
GPA: 3.73

Δ +0.18
```

### The important bit:

**Your production academic data remains untouched.**

Experiment as much as you want.

Copium is allowed in staging.

---

## 04 // 🏫 Singapore-Aware GPA Engine

Different institutions use different grading systems.

KiasuCode accounts for that instead of assuming every student uses the same scale.

### Currently supported:

#### 🏫 Institute of Technical Education

- ITE

#### 🎓 Polytechnics

- Nanyang Polytechnic — NYP
- Ngee Ann Polytechnic — NP
- Singapore Polytechnic — SP
- Temasek Polytechnic — TP
- Republic Polytechnic — RP

#### 🎓 Universities

- National University of Singapore — NUS
- Nanyang Technological University — NTU
- Singapore Management University — SMU
- Singapore Institute of Technology — SIT
- Singapore University of Technology and Design — SUTD

KiasuCode resolves the appropriate **4.0 or 5.0 grading scale** according to the selected institution.

No more manually changing GPA formulas every time.

---

## 05 // ⏳ DaysMatter Deadline Radar

### **Deadline blindness prevention system.**

Assignments have an incredible ability to be:

```text
"next month"
```

until suddenly they become:

```text
"11:59 PM TODAY"
```

DaysMatter provides visual countdowns for:

- 📝 Assignments
- 📚 Exams
- 💻 Projects
- 📌 Personal milestones
- 🎯 Custom categories

Countdown cards provide high-visibility deadline information so upcoming academic incidents are difficult to ignore.

And when Telegram is linked, KiasuCode can automatically send reminder notifications before selected deadlines.

```text
T-3 DAYS  ⚠ PROJECT SUBMISSION
T-1 DAY   🚨 FINAL WARNING
```

Kiasu already.

---

## 06 // ✅ Schedule & To-Do Operations

KiasuCode includes a dedicated scheduling system for both classes and personal tasks.

### Timetable

Store:

- Class title
- Lecturer / instructor
- Room or location
- Day
- Start time
- End time
- Custom colour

### To-Do Pipeline

Track:

- Tasks
- Labels
- Descriptions
- Deadlines
- Completion status

Your dashboard can then surface the information that matters **today** instead of forcing you to inspect your entire semester manually.

---

## 07 // 🍅 Pomodoro Focus Runtime

### **Deploy focus. Farm coins. Repeat.**

KiasuCode turns Pomodoro sessions into a game loop.

Start a focused study block and associate it with:

- A module
- A revision task
- Or a custom study category

Complete focus sessions to build your study history and earn **Study Coins**.

```text
$ focus --module IT2113 --duration 25

Initializing focus environment...
Distractions stashed.
Timer running.

✓ Focus block completed.
+25 Study Coins
```

Your completed sessions also contribute to your study activity history.

Small commits.

Every day.

---

## 08 // 🐣 Pomodoro Pet Companion

Yes.

Your academic operating system has a pet.

Because apparently maintaining your GPA wasn't enough responsibility.

Study Coins earned from focus sessions can be used to feed and level up your companion.

Starter companions include characters such as:

- 🐧 Kopi Penguin
- 🦁 Singa Lion
- 🦦 Otter Cadet
- 🐶 Merlion Pup
- 🐉 Dragon Playground

Your companion tracks progression including:

```text
LEVEL
XP
HUNGER
HAPPINESS
COIN BALANCE
```

Study more.

Pet becomes happy.

Stop studying.

Pet starts judging your life choices.

---

## 09 // 📂 Module File Vault

### **Stop asking yourself where you saved the lecture PDF.**

Each module includes its own file storage pipeline.

Upload academic materials such as:

- Lecture slides
- Lab manuals
- Tutorials
- Project specifications
- Revision notes
- Cheat sheets
- Reference documents

Files remain associated with the module they belong to, giving every class its own central document vault.

```text
CS2103T/
├── Lecture10_DesignPatterns.pdf
├── Tutorial07.pdf
├── FinalExamNotes.pdf
└── please_save_me.pdf
```

Much better.

---

## 10 // 👥 Multiplayer Study Rooms

Studying alone at 2 AM is character development.

But sometimes accountability helps.

KiasuCode includes real-time Study Rooms where students can:

- Join collaborative rooms
- See participant presence
- Run synchronized study timers
- Connect with friends
- View active study activity
- Study together remotely

Real-time communication is powered through **Socket.IO**.

```text
ROOM: Finals Chiong Station

Felicia      ● FOCUSING
Friend A     ● FOCUSING
Friend B     ○ suspiciously idle
```

---

## 11 // 🔐 Private Encrypted Chat

KiasuCode includes private one-to-one messaging between students.

Messages are encrypted on the client using the browser's **Web Crypto API** with a hybrid cryptographic flow involving:

- RSA-OAEP
- AES-GCM-256
- Browser-side key handling
- IndexedDB key storage
- Encrypted WebSocket message transport

The server routes encrypted message payloads rather than needing access to plaintext conversation content.

Academic suffering can remain private.

---

## 12 // 🤖 Telegram Integration

The soul of the original KiasuCode bot still lives inside the platform.

Telegram can be connected for automation such as:

- Deadline reminders
- Countdown alerts
- Friend request notifications
- Password recovery OTP delivery

Background jobs are handled through `node-cron`, while notification messages are delivered through the Telegram Bot API.

```text
⏰ KiasuCode Reminder

Your countdown for:
IT2113 Cloud Assignment

is approaching.

T-1 DAY

Go chiong already.
```

---

# 🧩 Architecture

KiasuCode uses a full-stack monorepo architecture.

```text
                         ┌──────────────────────┐
                         │       STUDENT        │
                         └──────────┬───────────┘
                                    │
                                    ▼
                     ┌────────────────────────────┐
                     │      REACT FRONTEND        │
                     │                            │
                     │  Dashboard                 │
                     │  GPA Staging               │
                     │  Pomodoro / Pet            │
                     │  Countdowns                │
                     │  Study Rooms               │
                     │  Module Files              │
                     └─────────────┬──────────────┘
                                   │
                         REST API / Socket.IO
                                   │
                                   ▼
                     ┌────────────────────────────┐
                     │    NODE + EXPRESS API      │
                     │                            │
                     │  Authentication            │
                     │  Academic Engine           │
                     │  Gamification              │
                     │  File Management           │
                     │  Messaging                 │
                     │  Reminder Scheduler        │
                     └──────────┬───────┬─────────┘
                                │       │
                   ┌────────────┘       └────────────┐
                   ▼                                 ▼
          ┌─────────────────┐              ┌──────────────────┐
          │      MySQL      │              │ Telegram Bot API │
          │    Railway      │              │   Notifications  │
          └─────────────────┘              └──────────────────┘
```

---

# 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 |
| **Language** | TypeScript 6 |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS 4 |
| **Routing** | React Router |
| **Backend** | Node.js 22 + Express 5 |
| **Database** | MySQL |
| **Database Hosting** | Railway |
| **Realtime** | Socket.IO |
| **Authentication** | Local Auth, Google OAuth, Telegram Integration |
| **Password Security** | bcrypt |
| **Session / Tokens** | JWT |
| **Cryptography** | Web Crypto API, RSA-OAEP, AES-GCM |
| **Task Scheduling** | node-cron |
| **File Uploads** | Multer |
| **Testing** | Playwright |
| **Repository Structure** | npm Workspaces / Monorepo |

---

# 📁 Repository Structure

```text
KiasuCode/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── utils/
│   └── public/
│
├── backend/
│   └── src/
│       ├── config/
│       ├── cron/
│       ├── db/
│       ├── middleware/
│       ├── routes/
│       ├── sockets/
│       └── utils/
│
├── packages/
│   └── shared/
│       └── src/
│
├── e2e/
│   ├── auth.spec.ts
│   └── timer.spec.ts
│
├── legacy-bot/
│
├── package.json
└── README.md
```

The frontend, backend and shared TypeScript definitions are managed through **npm workspaces**.

---

# 🚀 Local Development

## 1. Requirements

Make sure you have:

```text
Node.js >= 22
npm
MySQL
Git
```

---

## 2. Clone KiasuCode

```bash
git clone https://github.com/feliciatanxl/KiasuCode.git
cd KiasuCode
```

---

## 3. Install Dependencies

The repository uses npm workspaces, so dependencies can be installed from the root:

```bash
npm install
```

---

## 4. Configure Backend Environment

Create:

```text
backend/.env
```

Example:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=mysql://user:password@localhost:3306/kiasucode

# Authentication
JWT_SECRET=replace_with_a_secure_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CLIENT_ID=your_telegram_bot_id

# Frontend Origins
FRONTEND_URL=http://localhost:5173
LOCAL_FRONTEND_URL=http://localhost:5173
```

You can also configure MySQL using individual connection parameters:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=kiasucode_user
DB_PASSWORD=your_password
DB_NAME=kiasucode
```

---

## 5. Configure Frontend Environment

Create:

```text
frontend/.env
```

Example:

```env
VITE_API_URL=http://localhost:3000
VITE_AUTH_API_URL=http://localhost:3000

VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
VITE_TELEGRAM_BOT_NAME=YourBotUsernameHere
```

> ⚠️ Never commit production secrets or bot tokens into Git.

---

## 6. Boot the Academic Operating System

From the repository root:

```bash
npm run dev
```

This starts both workspaces concurrently.

```text
Frontend → http://localhost:5173
Backend  → http://localhost:3000
```

Backend health check:

```text
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "kiasucode-backend"
}
```

If everything boots:

```text
✓ frontend.runtime initialized
✓ backend.api listening
✓ database connection active

KiasuCode is live.

Time to chiong.
```

---

# 🧪 Development Commands

```bash
# Start frontend + backend
npm run dev

# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend

# Production build
npm run build

# TypeScript checks
npm run typecheck

# Lint workspaces
npm run lint

# End-to-end tests
npm run test:e2e
```

---

# 🔐 Security Principles

KiasuCode handles authentication, private academic data and communication, so security is treated as part of the architecture rather than an afterthought.

Current protections include:

- Password hashing with bcrypt
- JWT-based authentication
- Rate limiting
- CORS restrictions
- Parameterized database queries
- Ownership validation
- Protected routes
- Client-side encrypted private messaging
- OTP-based password recovery
- Environment-based secret management

And obviously:

```text
.env
```

belongs in:

```text
.gitignore
```

Don't deploy secrets to GitHub.

Later kena compromised then jialat.

---

# 🗣 Dev-Lingua

KiasuCode has one additional dependency:

**Singaporean academic trauma.**

Instead of sounding like another boring enterprise dashboard, the platform includes a custom **Dev-Lingua** system that mixes software engineering terminology with local Singapore flavour.

You may encounter messages such as:

```text
"Don't kanchiong, small commits every day sure make it one."

"GPA regression detected. Time to hotfix study plan, can?"

"Stash your distractions, checkout to focus branch, let's ship it!"

"Build failed jialat sia. Need to chiong before deadline!"

"Keep shipping and stay kiasu —
 continuous integration, continuous improvement."
```

Professional architecture.

Questionable emotional support.

Perfectly balanced.

---

# 🕰 Where It Started

KiasuCode originally began as a **Telegram academic assistant**.

The earlier bot architecture introduced many of the concepts that eventually became the full platform:

```text
/dashboard   → Academic telemetry
/manage      → Module management
/staging     → GPA simulation
/undo        → Recovery workflow
```

It also introduced iconic systems such as:

- 🎛️ Command Center
- 🛠️ Production Environment
- 🧪 Staging Sandbox
- 📉 GPA forecasting
- 🤖 Automated academic reminders
- 🇸🇬 Dev-Lingua

That implementation is preserved under:

```text
/legacy-bot
```

The Telegram bot wasn't deleted.

**It got promoted into infrastructure.**

---

# 💡 Project Philosophy

KiasuCode is built around one idea:

### **Academic planning should feel less like administration and more like operating a system you actually understand.**

Students already understand:

```text
progress
deadlines
targets
iterations
failures
recovery
```

Software engineers just have more dramatic names for them.

So KiasuCode turns:

```text
"I hope I can get an A."
```

into:

```text
TARGET_GRADE=A
CURRENT_PROGRESS=72%
ERROR_BUDGET=8%
STATUS=CHIONG_REQUIRED
```

Same anxiety.

Better telemetry.

---

# 🎯 Why “KiasuCode”?

**Kiasu** — the very Singaporean instinct of not wanting to lose out.

**Code** — because apparently even our GPA needs version control.

Together:

> **KiasuCode — because your semester deserves a staging environment too.**

---

<div align="center">

## 🚀 Ready to ship the semester?

```text
$ git checkout -b semester/new
$ npm run chiong
$ git commit -m "feat: somehow survived another semester"
$ git push origin graduation
```

### Built with ⌨️, TypeScript, questionable sleep schedules and kopi. ☕

**Ship steady. Score steady.**

🇸🇬 Singapore

</div>
