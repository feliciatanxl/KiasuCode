# KiasuCode - Quick Start Guide 🚀

## 🎯 5-Minute Setup

### 1. MySQL Setup (1 min)
Ensure you have a MySQL database created (default name: `kiasucode`). The bot will automatically initialize the tables for you on startup.

### 2. Set Up Environment (1 min)
Update your `.env` file with these keys:
```env
TELEGRAM_TOKEN=your_token
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=kiasucode
3. Start the Bot (1 min)
Bash
npm run dev
🧪 Test the Bot
Send /commit IT101 4 A to your bot. It should reply with:

✅ Module committed successfully! - LGTM


---

### 3. Updated `IMPLEMENTATION_ROADMAP.ts`
Checking off the items we just finished in `queries.ts` and `commit.ts`.

```typescript
export const IMPLEMENTATION_ROADMAP = {
  completed: [
    "Project structure & MySQL pooling",
    "Dev-Lingua middleware (Fixed scope error)",
    "ensureStudentProfile() logic",
    "insertModuleGrade() logic",
    "updateStudentGPA() (Weighted calculation)",
    "/commit command integration"
  ],
  inProgress: [
    "/gpa command (Fetch results)",
    "/history command (List modules)"
  ],
  todo: [
    "/start onboarding",
    "Input validation refinements",
    "Dockerization"
  ],
};