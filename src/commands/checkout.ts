import { Context, Telegraf } from "telegraf";
import * as queries from "../database/queries";
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

  // 1. 🚀 THE USERNAME FIX: Extract and Fallback!
  const rawUsername = ctx.from?.username;
  const firstName = ctx.from?.first_name;

  try {
    // 2. Ensure the student profile exists first (this handles the username logic)
    await queries.ensureStudentProfile(userId, rawUsername, firstName);

    // 3. Update the branch and save the OLD one into 'prev' columns automatically
    await queries.updateStudentBranch(userId, school, year, sem);

    const responseMessage = 
      "<b>📂 BRANCH SWITCH SUCCESSFUL</b>\n\n" +
      "Target: <code>" + school + " ➜ " + year + " ➜ " + sem + "</code>\n\n" +
      "<i>Previous branch saved to reflog. Run <code>/revert_branch</code> to jump back!</i>";

    await replyWithFlavor(ctx, responseMessage, "positive");
    
  } catch (error) {
    console.error("❌ Checkout command error:", error);
    await replyWithFlavor(
      ctx, 
      "<b>⚠️ MERGE CONFLICT</b>\nSomething went wrong with the database update lor.", 
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