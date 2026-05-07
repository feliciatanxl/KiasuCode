/**
 * KiasuCode Telegram Bot - Enterprise V3.0
 * Initialize bot, attach middleware, register Super Menus
 * Steady lah, let's ship this code!
 */

import { Telegraf } from "telegraf";
import { config } from "./config";
import { initializeDatabase, closeDatabase } from "./database/connection";
import { initializeSchema } from "./database/schema";
import { devLinguaMiddleware } from "./middleware/devLingua";
import cron from "node-cron"; 
import * as queries from "./database/queries";

// --- CORE MENU IMPORTS ---
import { registerStartCommand } from "./commands/start";
import { registerLobangCommand } from "./commands/lobang";
import { registerSpecsCommand } from "./commands/specs";
import { registerDashboardCommand } from "./commands/dashboard";
import { registerManageCommand } from "./commands/manage";
import { registerStagingCommand } from "./commands/staging";
import { registerUndoCommand } from "./commands/undo";

// --- LOGIC IMPORTS (Needed for background routing) ---
import { registerCommitCommand } from "./commands/commit";
import { registerCheckoutCommand } from "./commands/checkout";
import { registerDropCommand } from "./commands/drop";
import { registerPatchCommand } from "./commands/patch";
import { registerDeadlineCommand } from "./commands/deadline";
import { registerAgakAgakCommand } from "./commands/agak_agak";
import { registerSpillCommand } from "./commands/spill";
import { registerFlushCommand } from "./commands/flush";
import { registerCopiumCommand } from "./commands/copium";
import { registerChiongCommand } from "./commands/chiong";
import { registerGpaCommand } from "./commands/gpa";
import { registerLogsCommand } from "./commands/logs";
import { registerKaypohCommand } from "./commands/kaypoh";
import { registerPipelineCommand } from "./commands/pipeline";
import { handleDropCommand } from "./commands/drop";
import { handlePatchCommand } from "./commands/patch";

let bot: Telegraf;

async function initializeBot(): Promise<void> {
  try {
    console.log("🚀 Initializing KiasuCode bot...");
    bot = new Telegraf(config.telegram.token);

    
    await bot.telegram.setMyCommands([
      { command: 'start', description: '🚀 Initialize or restart your KiasuCode repo' },
      { command: 'dashboard', description: '🎛️ View CGPA, Logs, and Deadlines' },
      { command: 'manage', description: '🛠️ Production: Commit, Branch, Patch, Drop' },
      { command: 'staging', description: '🧪 Sandbox: Agak-Agak, Copium, Stress Test' },
      { command: 'undo', description: '🔙 Ctrl+Z: Revert commits, branches, or drops' },
      { command: 'lobang', description: '📖 Pull the dev manual' },
      { command: 'specs', description: '⚙️ Show GPA grading architecture' }
    ]);

    await initializeDatabase();
    await initializeSchema();
    bot.use(devLinguaMiddleware); 

    // Register Hubs
    registerStartCommand(bot);
    registerLobangCommand(bot);
    registerSpecsCommand(bot);
    registerDashboardCommand(bot);
    registerManageCommand(bot);
    registerStagingCommand(bot);
    registerUndoCommand(bot);

    // Register Background Logic Listeners (Silent to menu, active in code)
    registerCommitCommand(bot);
    registerCheckoutCommand(bot);
    registerDropCommand(bot);
    registerPatchCommand(bot);
    registerDeadlineCommand(bot);
    registerAgakAgakCommand(bot);
    registerSpillCommand(bot);
    registerFlushCommand(bot);
    registerCopiumCommand(bot);
    registerChiongCommand(bot);
    registerGpaCommand(bot);
    registerLogsCommand(bot);
    registerKaypohCommand(bot);
    registerPipelineCommand(bot);
    registerDropCommand(bot);
    registerPatchCommand(bot);

    bot.catch(async (err: any, ctx: any) => {
      console.error("❌ Bot error occurred:", err);
      try { await ctx.reply(`Oops, error lor! Our devs are debugging. Error: ${err.message}`); } catch (e) {}
    });

    process.on("SIGINT", shutdownBot);
    process.on("SIGTERM", shutdownBot);
    console.log("🎉 KiasuCode bot initialized - wah shiok!");
  } catch (error) {
    console.error("❌ Failed to initialize bot:", error);
    process.exit(1);
  }
}

async function startBot(): Promise<void> {
  try {
    await bot.launch();
    console.log("✅ Bot is live! - commit accepted!");

    // PIPELINE MONITOR (CRON JOB)
    cron.schedule('0 9 * * *', async () => {
      try {
        const upcoming = await queries.getUpcomingDeadlines(); 
        if (upcoming.length === 0) return;

        const userGroups: { [key: number]: any[] } = {};
        upcoming.forEach(issue => {
          if (!userGroups[issue.userId]) userGroups[issue.userId] = [];
          userGroups[issue.userId].push(issue);
        });

        for (const [userId, issues] of Object.entries(userGroups)) {
          let dailyBriefing = `🚀 <b>DAILY PIPELINE STAND-UP</b>\nBuild Status: <b>CRITICAL</b> (Issues due < 72h)\n\n`;
          issues.forEach((issue: any) => {
            const dateObj = new Date(issue.due_date);
            const displayDate = dateObj.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            dailyBriefing += `• <b>${issue.task_name.replace(/_/g, " ")}</b>\n  └ 🎯 Target: <code>${displayDate}</code>\n\n`;
          });
          dailyBriefing += `Don't slack, time to chiong! 🔥`;
          await bot.telegram.sendMessage(userId, dailyBriefing, { parse_mode: "HTML" });
        }
      } catch (error) {
        console.error("❌ Pipeline Monitor Error:", error);
      }
    }, { timezone: "Asia/Singapore" });
  } catch (error) {
    throw error;
  }
}

async function shutdownBot(): Promise<void> {
  try {
    if (bot) await bot.stop();
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await initializeBot();
  await startBot();
}
main().catch((error) => process.exit(1));
export { bot };