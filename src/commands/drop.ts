import { Context, Telegraf } from "telegraf";
import { removeModuleGrade } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /drop command
 * Removes a module from the student's academic build and updates GPA
 */
export async function handleDropCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;

  // Type guard for message text - LGTM pattern to ensure safety
  if (!userId || !message || !("text" in message)) return;

  // Parse argument: "/drop IT101" -> "IT101"
  const args = message.text.split(/\s+/);
  const moduleCode = args[1]?.toUpperCase();

  if (!moduleCode) {
    await replyWithFlavor(
      ctx, 
      "Usage: /drop <module_code>\nExample: /drop IT101", 
      "negative"
    );
    return;
  }

  try {
    // Calling the existing query logic to drop the module from MySQL
    const result = await removeModuleGrade(userId, moduleCode);
    
    if (result.success) {
      await replyWithFlavor(
        ctx, 
        `✅ Build updated: ${moduleCode} has been dropped from the repository. GPA recalculated!`, 
        "positive"
      );
    } else {
      // Handles cases where moduleCode doesn't exist in DB
      await replyWithFlavor(ctx, result.message, "negative");
    }
  } catch (error) {
    console.error("❌ Drop command error:", error);
    await replyWithFlavor(
      ctx, 
      "Merge conflict during drop process lor! Check your connection.", 
      "negative"
    );
  }
}

/**
 * Register drop command handler
 * @param bot - Telegraf bot instance
 */
export function registerDropCommand(bot: Telegraf): void {
  bot.command("drop", handleDropCommand);
}