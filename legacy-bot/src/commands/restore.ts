import { Context, Telegraf } from "telegraf";
import * as queries from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * RESTORE COMMAND: Recovers the most recently dropped module.
 * Vibe: git restore <file>
 */
export async function handleRestoreCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // 1. Attempt to find and "un-drop" the last deleted module
    const result = await queries.restoreModuleGrade(userId);

    if (!result.success) {
      // Handles the case where the Recycle Bin is already empty
      await replyWithFlavor(ctx, result.message, "casual");
      return;
    }

    // 2. IMPORTANT: Refresh GPA and module count now that the record is active
    await queries.updateStudentGPA(userId);

    const restoredCode = result.message; // The module code returned from the query

    const successMessage = 
      `♻️ <b>RESTORE SUCCESSFUL</b>\n` +
      `Target: <code>${restoredCode}</code>\n\n` +
      `The module has been recovered from the bin and your stats have been synchronized. Branch is now back to stable! ✅`;

    await replyWithFlavor(ctx, successMessage, "positive");

  } catch (error) {
    console.error("❌ Restore Command Error:", error);
    await replyWithFlavor(
      ctx, 
      "<b>⚠️ RESTORE FAILED</b>\nSystem couldn't retrieve the module from the bin. Repository might be corrupted lor!", 
      "negative"
    );
  }
}

/**
 * Register command
 */
export function registerRestoreCommand(bot: Telegraf): void {
  bot.command("restore", handleRestoreCommand);
  bot.command("undrop", handleRestoreCommand); // Useful alias
}