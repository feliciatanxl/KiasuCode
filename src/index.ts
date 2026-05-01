/**
 * KiasuCode Telegram Bot - Main Entry Point
 * Initialize bot, attach middleware, register commands
 * Steady lah, let's ship this code!
 */

import { Telegraf } from "telegraf";
import { config } from "./config";
import { initializeDatabase, closeDatabase } from "./database/connection";
import { initializeSchema } from "./database/schema";
import { devLinguaMiddleware } from "./middleware/devLingua";
import { registerCommitCommand } from "./commands/commit";
import { registerGpaCommand } from "./commands/gpa";
import { registerDropCommand } from "./commands/drop";
import { registerLobangCommand } from "./commands/lobang";
import { registerPatchCommand } from "./commands/patch";
import { registerKaypohCommand } from "./commands/kaypoh";
import { registerCheckoutCommand } from "./commands/checkout";
import { registerSpecsCommand } from "./commands/specs";
import { registerLogsCommand } from "./commands/logs";
import { registerCopiumCommand } from "./commands/copium";
import { registerChiongCommand } from "./commands/chiong";
import { registerRollbackCommand } from "./commands/rollback";
import { registerStartCommand } from "./commands/start";
import { registerPipelineCommand } from "./commands/pipeline";
import { registerRevertBranchCommand } from "./commands/revert_branch";
import { registerRestoreCommand } from "./commands/restore";
import { registerAgakAgakCommand } from "./commands/agak_agak";
import { registerDeadlineCommand } from "./commands/deadline";
import { registerFlushCommand } from "./commands/flush";

import cron from "node-cron"; 
import * as queries from "./database/queries";

/**
 * Global bot instance
 * Accessible throughout the application - steady lah
 */
let bot: Telegraf;

/**
 * Initialize the bot
 * 1. Setup Telegraf
 * 2. Connect MySQL (Async pool, not synchronous SQLite!)
 * 3. Attach Dev-Lingua Personality
 * 4. Register All Commands
 */
async function initializeBot(): Promise<void> {
  try {
    console.log("🚀 Initializing KiasuCode bot...");

    bot = new Telegraf(config.telegram.token);

    // Update menu descriptions to reflect "Smart Router" logic
    await bot.telegram.setMyCommands([
      { command: 'checkout', description: 'Change your active School/Sem branch' },
      { command: 'commit', description: 'Chiong your grades into the system' },
      { command: 'gpa', description: 'Check your current Academic Build Status' },
      { command: 'kaypoh', description: 'View your full module repository' },
      { command: 'drop', description: 'Drop a module from your repo' },
      { command: 'patch', description: 'Apply a hotfix to a module grade' },
      { command: 'specs', description: 'Show GPA system' },
      { command: 'restore', description: 'Recover the last dropped module from the bin (Undo drop)' },
      { command: 'rollback', description: 'Revert the last module commit (Undo)' },
      { command: 'revert_branch', description: 'Switch to the previous branch (Undo checkout)' },
      { command: 'agak_agak', description: 'Staging Environment: Forecast your exam targets (Can survive or not?)' },
      { command: 'salah', description: 'Alamak! Undo last /agak_agak entry' },
      { command: 'flush', description: 'Purge staging data (Target mod or --all)' },
      { command: 'copium', description: 'Simulate GPA if you score straight As (Thoughts and Prayers)' },
      { command: 'chiong', description: 'Stress test your target CGPA. See how much you can slack.' },
      { command: 'deadline', description: 'Manage your task deadlines - add, view, drop, patch'},
      { command: 'pipeline', description: 'View your upcoming deadlines pipeline' },
      { command: 'logs', description: 'View full commit history and CGPA summary' },
      { command: 'lobang', description: 'Pull the dev manual (Help)' }
    ]);

    console.log("✅ Telegraf instance created - ready to chiong!");

    // Initialize MySQL Database & Schema
    await initializeDatabase();
    await initializeSchema();

    // 🌟 UNCOMMENTED: Injecting personality into every response!
    bot.use(devLinguaMiddleware); 

    console.log("✅ Dev-Lingua middleware attached - all responses shiok!");

    // Register all command handlers
    registerCheckoutCommand(bot);
    registerCommitCommand(bot);
    registerChiongCommand(bot);
    registerRevertBranchCommand(bot);
    registerGpaCommand(bot);
    registerCopiumCommand(bot);
    registerKaypohCommand(bot);
    registerDropCommand(bot);
    registerPatchCommand(bot);
    registerLobangCommand(bot);
    registerFlushCommand(bot);
    registerRollbackCommand(bot);
    registerSpecsCommand(bot);
    registerLogsCommand(bot);
    registerAgakAgakCommand(bot);
    registerStartCommand(bot);
    registerDeadlineCommand(bot);
    registerPipelineCommand(bot);
    registerRestoreCommand(bot);

    console.log("✅ Commands registered - ready for action!");

    // Catch unhandled errors gracefully
    bot.catch(async (err: any, ctx: any) => {
      console.error("❌ Bot error occurred:", err);
      try {
        // 🌟 ADDED AWAIT: Ensures the error message actually ships
        await ctx.reply(`Oops, error lor! Our devs are debugging. Error: ${err.message}`);
      } catch (e) {
        console.error("Failed to send error message:", e);
      }
    });

    // Handle graceful shutdowns
    process.on("SIGINT", shutdownBot);
    process.on("SIGTERM", shutdownBot);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 KiasuCode bot initialized - wah shiok!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ Failed to initialize bot:", error);
    process.exit(1);
  }
}

async function startBot(): Promise<void> {
  try {
    console.log("🤖 Starting bot polling...");
    await bot.launch();
    console.log("✅ Bot is live! - commit accepted!");

    // --- PIPELINE MONITOR (CRON JOB) ---
    // Runs every day at 09:00 Singapore Time
    cron.schedule('0 9 * * *', async () => {
      try {
        const upcoming = await queries.getUpcomingDeadlines(); 

        if (upcoming.length === 0) return; // Silent if the pipeline is clear

        // Group issues by user so we send one consolidated "Daily Briefing"
        const userGroups: { [key: number]: any[] } = {};
        upcoming.forEach(issue => {
          if (!userGroups[issue.userId]) userGroups[issue.userId] = [];
          userGroups[issue.userId].push(issue);
        });

        for (const [userId, issues] of Object.entries(userGroups)) {
          let dailyBriefing = `🚀 <b>DAILY PIPELINE STAND-UP</b>\n`;
          dailyBriefing += `Build Status: <b>CRITICAL</b> (Issues due < 72h)\n\n`;

          issues.forEach((issue: any) => {
            const dateObj = new Date(issue.due_date);
            const displayDate = dateObj.toLocaleDateString('en-SG', { 
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
            });
            
            dailyBriefing += `• <b>${issue.task_name.replace(/_/g, " ")}</b>\n`;
            dailyBriefing += `  └ 🎯 Target: <code>${displayDate}</code>\n\n`;
          });

          dailyBriefing += `Don't slack, time to chiong! 🔥`;

          await bot.telegram.sendMessage(userId, dailyBriefing, { parse_mode: "HTML" });
        }
      } catch (error) {
        console.error("❌ Pipeline Monitor Error:", error);
      }
    }, {
      timezone: "Asia/Singapore" // 🇸🇬 Stays consistent with your deadline.ts fix
    });
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    throw error;
  }
}

async function shutdownBot(): Promise<void> {
  console.log("\n🛑 Shutdown signal received...");
  try {
    if (bot) await bot.stop();
    await closeDatabase();
    console.log("🚀 Graceful shutdown complete - code shipped!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await initializeBot();
  await startBot();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { bot };