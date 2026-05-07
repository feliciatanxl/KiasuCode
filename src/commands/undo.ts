import { Context, Telegraf, Markup } from "telegraf";
import { getDatabase } from "../database/connection";
import * as queries from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /undo command (Smart Router)
 * Vibe: The ultimate "Ctrl+Z" menu for the entire system
 */
export async function handleUndoCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  await ctx.reply(
    "🔄 <b>SYSTEM RECOVERY: What do you want to undo?</b>\nSelect an action to revert your last deployment:",
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Undo Last Grade Commit", "btn_undo_commit")],
        [Markup.button.callback("🔀 Undo Branch Checkout", "btn_undo_checkout")],
        [Markup.button.callback("♻️ Restore Dropped Module", "btn_undo_drop")]
      ])
    }
  );
}

/**
 * Register the /undo command and its button actions
 */
export function registerUndoCommand(bot: Telegraf): void {
  bot.command("undo", handleUndoCommand);
  bot.command("rollback", handleUndoCommand); // Keep old command as an alias
  bot.command("revert", handleUndoCommand);   // Keep old command as an alias

  // --- 🔙 ACTION 1: UNDO COMMIT (The old rollback.ts) ---
  bot.action("btn_undo_commit", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    await ctx.answerCbQuery("Reverting commit...");
    const db = getDatabase();

    try {
      const [result]: any = await db.query(
        `DELETE FROM module_grades WHERE userId = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );

      if (result.affectedRows === 0) {
        await ctx.editMessageText("Wah lau, your repo is clean! No commits found to rollback.");
        return;
      }

      await queries.updateStudentGPA(userId); // Recalculate GPA!

      await ctx.editMessageText(
        `🗑️ <b>REVERT SUCCESSFUL</b>\n<i>Status: HEAD moved back by 1 commit</i>\n\nYour last module entry has been purged. Build restored to stable state. ✅`,
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error("❌ Undo Commit error:", error);
      await ctx.editMessageText("Rollback failed! System encountered a merge conflict.");
    }
  });

  // --- 🔀 ACTION 2: UNDO CHECKOUT (The old revert_branch.ts) ---
  bot.action("btn_undo_checkout", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCbQuery("Swapping branches...");

    try {
      await queries.revertStudentBranch(userId);
      const profile = await queries.getStudentProfile(userId);

      if (!profile || !profile.prevSchool) {
        await ctx.editMessageText("No previous branch found in your reflog! Cannot jump back.");
        return;
      }

      await ctx.editMessageText(
        `🔄 <b>GIT CHECKOUT -</b>\nSwitched back to: <code>${profile.activeSchool} / ${profile.activeYear} / ${profile.activeSemester}</code>\n\n<i>HEAD is now at previous state.</i>`,
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error("❌ Undo Checkout error:", error);
      await ctx.editMessageText("Wah lau, branch swap failed! System unstable.");
    }
  });

  // --- ♻️ ACTION 3: RESTORE DROP (The old restore.ts) ---
  bot.action("btn_undo_drop", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCbQuery("Restoring from bin...");

    try {
      const result = await queries.restoreModuleGrade(userId);

      if (!result.success) {
        await ctx.editMessageText(result.message);
        return;
      }

      await queries.updateStudentGPA(userId);

      await ctx.editMessageText(
        `♻️ <b>RESTORE SUCCESSFUL</b>\nTarget: <code>${result.message}</code>\n\nThe module has been recovered from the bin and your stats have been synchronized. ✅`,
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error("❌ Restore Command Error:", error);
      await ctx.editMessageText("<b>⚠️ RESTORE FAILED</b>\nSystem couldn't retrieve the module from the bin.", { parse_mode: 'HTML' });
    }
  });
}