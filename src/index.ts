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
import { registerRevertBranchCommand } from "./commands/revert_branch";
import { registerRestoreCommand } from "./commands/restore";
import { registerAgakAgakCommand } from "./commands/agak_agak";
import { registerFlushCommand } from "./commands/flush";
import { registerDeadlineCommand } from "./commands/deadline";
import { registerPipelineCommand } from "./commands/pipeline";

// --- CRON & QUERIES ---
import cron from "node-cron"; 
import * as queries from "./database/queries"; 

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
      { command: 'drop', description: 'Smart menu to remove modules or deadlines' },
      { command: 'patch', description: 'Hotfix menu for modules or deadlines' },
      { command: 'pipeline', description: 'View all active issues and target dates' },
      { command: 'deadline', description: 'Pipeline Monitor: Open a new deadline issue' },
      { command: 'agak_agak', description: 'Forecast exam targets (Can survive or not?)' },
      { command: 'logs', description: 'View commit history and CGPA summary' },
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
    registerDropCommand(bot);     // Smart Router for /drop
    registerPatchCommand(bot);    // Smart Router for /patch
    registerPipelineCommand(bot); // Dashboard view
    registerDeadlineCommand(bot); // CRITICAL: Handles /deadline, /drop_issue, /patch_issue
    registerLobangCommand(bot);
    registerFlushCommand(bot);
    registerRollbackCommand(bot);
    registerSpecsCommand(bot);
    registerLogsCommand(bot);
    registerAgakAgakCommand(bot);
    registerStartCommand(bot);
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
    // Runs every 1 minute for testing; update to hourly for production
    cron.schedule('* * * * *', async () => {
      try {
        const upcoming = await queries.getUpcomingDeadlines(); 

        for (const issue of upcoming) {
          const dateObj = new Date(issue.due_date);
          const dateString = dateObj.toLocaleDateString('en-SG');

          const warningMsg = `⚠️ <b>PIPELINE WARNING!</b>\n\nTask: <b>${issue.task_name.replace(/_/g, " ")}</b>\nTarget Deployment: <code>${dateString}</code>\n\nStatus: <b>CRITICAL</b>. You have less than 72 hours. Stop slacking and chiong immediately! 🚀`;

          await bot.telegram.sendMessage(issue.userId, warningMsg, { parse_mode: "HTML" });
        }
      } catch (error) {
        console.error("❌ Pipeline Monitor Error:", error);
      }
    }, {
      timezone: "Asia/Singapore"
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