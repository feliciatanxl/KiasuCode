# KiasuCode - Quick Start Guide 🚀

> Get the bot running in 5 minutes! Chiong lah!

## ⚡ Prerequisites (Must Have)

```bash
# Check you have these installed
node --version        # Should be 18+
npm --version         # Should be 9+
```

## 🎯 5-Minute Setup

### 1. Get Telegram Bot Token (2 min)
```bash
# Open Telegram and chat with @BotFather
# Send: /newbot
# Follow prompts, get your token
# Token looks like: 123456789:ABCdefGHIjklmnoPQRstuvWXYZ123456789
```

### 2. Install Dependencies (1 min)
```bash
cd c:\Users\Admin\Downloads\KiasuCode
npm install
```

### 3. Set Up Environment (1 min)
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add:
# - TELEGRAM_TOKEN=<your_token_from_BotFather>
# That's it! SQLite database is automatically created on first run!
```

### 4. Start the Bot! (No database setup needed!)
```bash
npm run dev
```

You should see:
```
✅ Telegraf instance created - ready to chiong!
✅ SQLite database connected - steady lah, we connected lor!
✅ Database schema initialized - LGTM!
✅ Dev-Lingua middleware attached - all responses shiok!
✅ Commands registered - ready for action!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 KiasuCode bot initialized - wah shiok!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Starting bot polling...
✅ Bot is live and polling! - commit accepted!
```

## 🧪 Test the Bot

Open Telegram and send commands to your bot:

```
/commit IT101 4 A
```

Bot should reply with something like:
```
LGTM: ✅ Module committed successfully!
Module: IT101
Credits: 4
Grade: A (4.0 points)
User ID: your_id

TODO: This will trigger SQLite INSERT query
TODO: Then recalculate student's overall GPA
```

## 📂 Important Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Bot entry point |
| `src/middleware/devLingua.ts` | Personality injection! ✨ |
| `src/commands/commit.ts` | /commit command |
| `src/database/queries.ts` | Database functions (TODO) |
| `.env` | Your secrets (NEVER commit!) |
| `kiasucode.db` | SQLite database (auto-created) |

## 🔧 Common Issues

### "Database not initialized"
- Make sure you called `npm run dev` and the database connected successfully
- Check `.env` has `DB_PATH=./kiasucode.db` set

### "TELEGRAM_TOKEN is missing"
- Check `.env` file exists and has `TELEGRAM_TOKEN=xxx`

### "MySQL error: Access denied"
- Check `.env` has correct DB_USER and DB_PASSWORD
- Check `.env` has `DB_PATH=./kiasucode.db` set

### "Cannot connect to database"
- SQLite uses a local file, so it should connect automatically
- Check that the project folder has write permissions
- Delete `kiasucode.db` and restart to recreate it


## 📚 Next Steps

1. **Implement database queries** in `src/database/queries.ts`
   - Start with `createStudentProfile()`
   - Then `insertModuleGrade()`
   - Then `updateStudentGPA()`

2. **Build more commands** in `src/commands/`
   - `/start` - user onboarding
   - `/gpa` - show current GPA
   - `/history` - list modules

3. **Test thoroughly** with your Telegram bot

4. **Deploy** to production (see main README.md)

## 🎓 Learning Points

- **Middleware Pattern**: See how `devLinguaMiddleware` wraps `ctx.reply()`
- **Connection Pooling**: See `src/database/connection.ts` for MySQL setup
- **Error Handling**: See graceful shutdown in `src/index.ts`
- **TypeScript**: Everything is strongly typed!

## 💡 Tips

- Dev mode auto-restarts when you save files
- Check console output for debug logs
- Use `npm run lint` to check code quality
- Use `npm run format` to format code

## 🚢 Ready to Build?

Everything is set up! Next step is implementing the database queries.

Check `IMPLEMENTATION_ROADMAP.ts` for what's next.

**Steady lah, you got this! Chiong! 💪**
