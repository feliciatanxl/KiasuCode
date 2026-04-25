/**
 * KiasuCode Telegram Bot - Main Entry Point
 * Initialize bot, attach middleware, register commands
 * Steady lah, let's ship this code!
 *
 * Architecture:
 * - Telegraf bot instance (core)
 * - Dev-Lingua middleware (personality)
 * - Commands handlers (functionality)
 * - Database connection (persistence)
 * - Error handling (reliability)
 *
 * LGTM - production-ready bot structure, no merge conflict here!
 */

import { Telegraf } from "telegraf";
import { config } from "./config";
import { initializeDatabase, closeDatabase } from "./database/connection";
import { initializeSchema } from "./database/schema";
import { devLinguaMiddleware } from "./middleware/devLingua";
import { registerCommitCommand } from "./commands/commit";

/**
 * Global bot instance
 * Accessible throughout the application - steady lah
 */
let bot: Telegraf;

/**
 * Initialize the bot
 * This function:
 * 1. Creates Telegraf instance with bot token
 * 2. Connects to MySQL database
 * 3. Registers global middleware (Dev-Lingua personality)
 * 4. Registers command handlers
 * 5. Sets up error handling
 *
 * @returns Promise<void>
 * @throws Error if initialization fails - wah lau, cannot proceed
 */
async function initializeBot(): Promise<void> {
  try {
    console.log("🚀 Initializing KiasuCode bot...");

    // Step 1: Create Telegraf bot instance with token
    // The token comes from BotFather - chiong lah!
    bot = new Telegraf(config.telegram.token);

    console.log("✅ Telegraf instance created - ready to chiong!");

    // Step 2: Initialize SQLite database
    // No async pool setup needed - SQLite is synchronous, steady lah!
    await initializeDatabase();

    // Step 2b: Create database schema (tables, indexes, etc.)
    await initializeSchema();

    // Step 3: Register global middleware
    // Dev-Lingua middleware runs on EVERY message - injects personality everywhere!
    bot.use(devLinguaMiddleware);

    console.log("✅ Dev-Lingua middleware attached - all responses shiok!");

    // Step 4: Register command handlers
    // /commit - add a module grade to student transcript
    registerCommitCommand(bot);

    // TODO: Register more commands as we build:
    // - /start - welcome message + student profile creation
    // - /gpa - show current GPA
    // - /history - list all committed modules
    // - /stats - detailed breakdown by semester/module
    // - /help - command reference

    console.log("✅ Commands registered - ready for action!");

    // Step 5: Set up error handling
    // Catch any unhandled errors from Telegram - must handle gracefully lor
    bot.catch((err: any, ctx: any) => {
      console.error("❌ Bot error occurred:", err);
      try {
        ctx.reply(
          `Oops, error lor! Our devs are debugging. Error: ${err.message}`
        );
      } catch (e) {
        console.error("Failed to send error message:", e);
      }
    });

    console.log(
      "✅ Error handling configured - production-ready safety net!"
    );

    // Step 6: Set up graceful shutdown handlers
    // Clean up resources when process exits - no resource leak!
    process.on("SIGINT", shutdownBot);
    process.on("SIGTERM", shutdownBot);

    console.log("✅ Shutdown handlers registered - steady lah!");

    // ALL SYSTEMS GO! 🚀
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 KiasuCode bot initialized - wah shiok!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ Failed to initialize bot:", error);
    process.exit(1);
  }
}

/**
 * Start the bot and begin polling for updates
 * Telegraf will continuously check for new messages from Telegram servers
 * This is the main blocking call - bot runs here until SIGINT/SIGTERM
 *
 * @returns Promise<void>
 */
async function startBot(): Promise<void> {
  try {
    console.log("🤖 Starting bot polling...");
    await bot.launch();
    console.log("✅ Bot is live and polling! - commit accepted!");
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    throw error;
  }
}

/**
 * Graceful shutdown handler
 * Called when process receives SIGINT (Ctrl+C) or SIGTERM (kill signal)
 * Closes database connections and stops bot polling cleanly
 * No resource leaks lor - ship it!
 *
 * @returns Promise<void>
 */
async function shutdownBot(): Promise<void> {
  console.log("\n🛑 Shutdown signal received - graceful shutdown initiated...");

  try {
    // Step 1: Stop the bot from polling new messages
    if (bot) {
      await bot.stop();
      console.log("✅ Bot stopped - no more polling");
    }

    // Step 2: Close SQLite database (synchronous operation)
    // No async needed - SQLite closes instantly, steady lah!
    await closeDatabase();
    console.log("✅ Database closed - steady lah!");

    console.log("🚀 Graceful shutdown complete - code shipped successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

/**
 * Main entry point
 * This is where the magic starts - LGTM!
 */
async function main(): Promise<void> {
  // Initialize everything
  await initializeBot();

  // Start polling for messages
  await startBot();
}

// Run the main function
// If any error occurs, process exits with code 1 - production safety
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { bot };
