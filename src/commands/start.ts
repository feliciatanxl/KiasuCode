import { Context, Telegraf } from "telegraf";
import { getDatabase } from "../database/connection";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /start command
 * The official "onboarding" for KiasuCode v3.0
 */
export async function handleStartCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const db = getDatabase();

  // 1. 🚀 THE USERNAME FIX: Extract and Fallback
  const rawUsername = ctx.from?.username;
  const firstName = ctx.from?.first_name;
  const dbUsername = rawUsername || firstName || "Student";

  try {
    // 2. Initial UPSERT - Create profile if it doesn't exist
    const query = `
      INSERT INTO students (userId, username)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username);
    `;

    await db.query(query, [userId, dbUsername]);

    // 3. Welcome Message (Upgraded for v3.0!)
    const welcome = 
      `<b>🚀 WELCOME TO KIASUCODE v3.0</b>\n` +
      `<i>Status: Enterprise UI Initialized</i>\n\n` +
      `Hello <b>${dbUsername}</b>! I'm your Senior Pair Programmer for your GPA build.\n\n` +
      `<b>HOW TO NAVIGATE:</b>\n` +
      `We've upgraded to a clean Dashboard system. Tap the blue <b>Menu</b> button below or type:\n\n` +
      `🎛️ <code>/dashboard</code> - View your CGPA, Logs & Deadlines\n` +
      `🛠️ <code>/manage</code> - Commit grades & switch branches\n` +
      `🧪 <code>/staging</code> - Forecast & stress-test your GPA\n\n` +
      `<i>// Ready to ship some As? Let's go!</i>`;

    await replyWithFlavor(ctx, welcome, "positive");

  } catch (error) {
    console.error("❌ Start command error:", error);
    await replyWithFlavor(ctx, "Wah lau, start engine failed! Try again later.", "negative");
  }
}

export function registerStartCommand(bot: Telegraf): void {
  bot.start(handleStartCommand);
}