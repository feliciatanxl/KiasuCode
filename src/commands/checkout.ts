import { Context, Telegraf } from "telegraf";
import { getDatabase } from "../database/connection";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /checkout command
 * Switches the user's active branch (School, Year, Sem)
 */
export async function handleCheckoutCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;

  if (!userId || !message || !("text" in message)) return;

  // Expected format: /checkout NYP Y1 S1
  const args = message.text.split(/\s+/).slice(1);

  if (args.length < 3) {
    await replyWithFlavor(
      ctx, 
      "Wah lau, missing arguments! \nUsage: `/checkout <SCHOOL> <YEAR> <SEM>`\nExample: `/checkout NYP Y1 S1`", 
      "negative"
    );
    return;
  }

  const [school, year, sem] = args;
  const db = getDatabase();

  try {
    // Update the student's active folder in the database
    await db.query(
      `UPDATE students 
       SET activeSchool = ?, activeYear = ?, activeSem = ? 
       WHERE userId = ?`,
      [school.toUpperCase(), year.toUpperCase(), sem.toUpperCase(), userId]
    );

    await replyWithFlavor(
      ctx, 
      `✅ Switched to branch: *${school.toUpperCase()} ➔ ${year.toUpperCase()} ➔ ${sem.toUpperCase()}*\nAll new commits will go here lor!`, 
      "positive"
    );
  } catch (error) {
    console.error("❌ Checkout command error:", error);
    await replyWithFlavor(ctx, "Merge conflict changing branches lor!", "negative");
  }
}

/**
 * Register checkout command handlers
 */
export function registerCheckoutCommand(bot: Telegraf): void {
  bot.command("checkout", handleCheckoutCommand);
  bot.command("branch", handleCheckoutCommand); // Alias for Git lovers
}