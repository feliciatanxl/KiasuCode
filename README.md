<div align="center">

# KiasuCode 🚀

**The all-in-one Academic Operating System for Singaporean students.**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

<br />

![KiasuCode Dashboard](./frontend/src/assets/hero.png)

</div>

---

## 📖 About The Project

**KiasuCode** replaces messy spreadsheets, scattered notes, and forgotten deadlines with a modern, high-performance academic command center. Built specifically for tertiary and university students in Singapore, KiasuCode unites academic progress tracking, task deadlines, and study gamification into a single, unified cockpit.

Whether you are calculating cumulative CAP/GPA targets, managing module assets across semesters, or seeking the motivation to conquer marathon study sessions, KiasuCode equips you with everything you need to stay ahead of the curve.

---

## ✨ Core Features

- 🎓 **Git-Style GPA Tracker**: Manage academic modules through a workflow pipeline from `Backlog` to `In Progress` to `Merged`. Includes an interactive staging simulator to forecast real-time term and cumulative GPA/CAP impacts.
- ⏳ **DaysMatter Countdowns**: Visual, color-coded rings and milestone cards to track upcoming final exams, midterms, and assignment submission deadlines with precision.
- 🍅 **Pomodoro Pet Companion**: A gamified study timer featuring customizable Focus and Break cycles. Completing focus blocks rewards you with study coins to feed and level up your virtual desk companion.
- 📱 **Telegram Bot Integration**: An automated notification pipeline built with Telegraf that syncs directly with the database to push daily deadline reminders and academic progress reports directly to your phone.
- 📂 **Module File Management**: Dedicated document vaults for every module to easily organize, upload, and download lecture slides, lab manuals, past-year papers, and project specs.

---

## 📸 Visual Tour

<div align="center">
  <table>
    <tr>
      <td width="50%">
        <h4 align="center">📊 Dashboard & GPA Pipeline</h4>
        <img src="./frontend/src/assets/screenshots/dashboard.png" alt="Dashboard View" width="100%" />
      </td>
      <td width="50%">
        <h4 align="center">⏱️ Solo Focus Timer & Pet</h4>
        <img src="./frontend/src/assets/screenshots/timer.png" alt="Solo Timer" width="100%" />
      </td>
    </tr>
    <tr>
      <td width="50%">
        <h4 align="center">⏳ DaysMatter Countdowns</h4>
        <img src="./frontend/src/assets/screenshots/countdowns.png" alt="Countdowns View" width="100%" />
      </td>
      <td width="50%">
        <h4 align="center">⚙️ Settings & Telegram Alerts</h4>
        <img src="./frontend/src/assets/screenshots/settings.png" alt="Settings & Alerts" width="100%" />
      </td>
    </tr>
  </table>
</div>

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| **Backend** | Node.js, Express, TypeScript, Telegraf (Telegram Bot Framework) |
| **Database** | MySQL, Railway Database Hosting |
| **Authentication** | Google OAuth 2.0, Telegram Login Widget, Local JWT Sessions |
| **Tooling & CI** | npm workspaces, ESLint, TypeScript Compiler (`tsc`) |

---

## 🚀 Local Development (Quick Start)

Follow these steps to run KiasuCode locally on your machine.

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)
- **MySQL Server** (local instance or hosted database)

### 2. Clone the Repository
```bash
git clone https://github.com/feliciatanxl/KiasuCode.git
cd KiasuCode
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables

Create `.env` configuration files in both `frontend` and `backend` directories:

**Backend (`backend/.env`):**
```env
PORT=3000
DATABASE_URL=mysql://user:password@localhost:3306/kiasucode
SESSION_SECRET=your_super_secret_session_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GOOGLE_CLIENT_ID=your_google_client_id
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
```

### 5. Start Development Servers

Run the entire application (frontend + backend concurrently):
```bash
npm run dev
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000` (Health Check: `http://localhost:3000/health`)

### 6. Build and Verification
```bash
# Typecheck across all workspace packages
npm run typecheck

# Lint codebase
npm run lint

# Production build
npm run build
```

---

<div align="center">
  <sub>Built with ❤️ for Singaporean students aiming for First Class Honours.</sub>
</div>
