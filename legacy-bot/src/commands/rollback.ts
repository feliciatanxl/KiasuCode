import { Context, Telegraf } from "telegraf";
import { getDatabase } from "../database/connection";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * UNDO COMMIT: Reverts the most recent module entry.
 */
export async function handleRollbackCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const db = getDatabase();

  try {
    const [result]: any = await db.query(
        `DELETE FROM module_grades 
        WHERE userId = ? 
        ORDER BY id DESC 
        LIMIT 1`,
        [userId]
    );

    if (result.affectedRows === 0) {
      await replyWithFlavor(ctx, "Wah lau, your repo is clean! No commits found to rollback.", "casual");
      return;
    }

    const successMsg = 
      `🗑️ <b>REVERT SUCCESSFUL</b>\n` +
      `<i>Status: HEAD moved back by 1 commit</i>\n\n` +
      `Your last module entry has been purged. Build restored to stable state. ✅`;

    await replyWithFlavor(ctx, successMsg, "positive");

  } catch (error) {
    console.error("❌ Rollback error:", error);
    await replyWithFlavor(ctx, "Rollback failed! System encountered a merge conflict in the brain.", "negative");
  }
}

export function registerRollbackCommand(bot: Telegraf): void {
  bot.command("rollback", handleRollbackCommand);
  bot.command("revert", handleRollbackCommand); 
}