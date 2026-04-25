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
      "<b>⚠️ MISSING ARGUMENTS</b>\n\n" +
      "Usage: <code>/checkout &lt;SCHOOL&gt; &lt;YEAR&gt; &lt;SEM&gt;</code>\n" +
      "Example: <code>/checkout NYP Y1 S1</code>", 
      "negative"
    );
    return;
  }

  const [school, year, sem] = args.map(arg => arg.toUpperCase());
  const db = getDatabase();

  try {
    // Update the student's active folder in the database
    await db.query(
      `UPDATE students 
       SET activeSchool = ?, activeYear = ?, activeSem = ? 
       WHERE userId = ?`,
      [school, year, sem, userId]
    );

    const responseMessage = 
      "<b>📂 BRANCH SWITCH SUCCESSFUL</b>\n\n" +
      "Target: <code>" + school + " ➜ " + year + " ➜ " + sem + "</code>\n\n" +
      "All new commits will be deployed to this repository branch lor!";

    await replyWithFlavor(ctx, responseMessage, "positive");
    
  } catch (error) {
    console.error("❌ Checkout command error:", error);
    await replyWithFlavor(
      ctx, 
      "<b>⚠️ MERGE CONFLICT</b>\nError changing branches! Database might be locked lor.", 
      "negative"
    );
  }
}

/**
 * Register checkout command handlers
 */
export function registerCheckoutCommand(bot: Telegraf): void {
  bot.command("checkout", handleCheckoutCommand);
  bot.command("branch", handleCheckoutCommand); 
}