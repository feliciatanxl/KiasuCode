import { Context, Telegraf } from "telegraf";
import { getDatabase } from "../database/connection";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /start command
 * The official "onboarding" for KiasuCode
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

    // 3. Welcome Message
    const welcome = 
      `<b>🚀 WELCOME TO KIASUCODE v2.1</b>\n` +
      `<i>Status: Student Repo Initialized</i>\n\n` +
      `Hello <b>${dbUsername}</b>! I'm your Senior Pair Programmer for your GPA build.\n\n` +
      `<b>HOW TO CHIONG:</b>\n` +
      `1. Run <code>/checkout &lt;SCH&gt; &lt;YR&gt; &lt;SEM&gt;</code> to set your branch.\n` +
      `2. Use <code>/commit</code> to deploy your grades.\n` +
      `3. Type <code>/lobang</code> if you blur.\n\n` +
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