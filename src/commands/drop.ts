import { Context, Telegraf } from "telegraf";
import { removeModuleGrade } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /drop command
 * Removes a module from the user's active branch
 */
export async function handleDropCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const message = ctx.message;
  if (!message || !("text" in message)) return;

  // 1. Parse argument
  const args = message.text.split(/\s+/).slice(1);
  const moduleCode = args[0]?.toUpperCase();

  if (!moduleCode) {
    await replyWithFlavor(
      ctx, 
      "<b>🗑️ DROP USAGE</b>\n\n" +
      "Usage: <code>/drop &lt;module_code&gt;</code>\n" +
      "Example: <code>/drop IT1111</code>", 
      "negative"
    );
    return;
  }

  try {
    // 2. Call the database query
    const result = await removeModuleGrade(userId, moduleCode);

    if (result.success) {
      await replyWithFlavor(
        ctx, 
        `<b>✅ ROLLBACK SUCCESSFUL</b>\n\n` +
        `Module <code>${moduleCode}</code> has been removed from your active branch repository.`, 
        "positive"
      );
    } else {
      await replyWithFlavor(
        ctx, 
        `<b>❌ DROP FAILED</b>\n${result.message}`, 
        "negative"
      );
    }
  } catch (error) {
    console.error("❌ Drop command error:", error);
    await replyWithFlavor(
      ctx, 
      "<b>⚠️ MERGE CONFLICT</b>\nError dropping module from the database lor!", 
      "negative"
    );
  }
}

/**
 * Register drop command handlers
 */
export function registerDropCommand(bot: Telegraf): void {
  bot.command("drop", handleDropCommand);
  bot.command("remove", handleDropCommand);
  bot.command("delete", handleDropCommand);
}