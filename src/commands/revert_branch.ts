import { Context, Telegraf } from "telegraf";
import * as queries from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * UNDO CHECKOUT: Swaps current branch with the previous one.
 */
export async function handleRevertBranchCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // 1. Perform the swap in the DB
    await queries.revertStudentBranch(userId);

    // 2. Fetch the new current profile to show the user where they landed
    const profile = await queries.getStudentProfile(userId);

    if (!profile || !profile.prevSchool) {
      await replyWithFlavor(ctx, "No previous branch found in your reflog! Cannot jump back.", "casual");
      return;
    }

    const message = 
      `🔄 <b>GIT CHECKOUT -</b>\n` +
      `Switched back to: <code>${profile.activeSchool} / ${profile.activeYear} / ${profile.activeSemester}</code>\n\n` +
      `<i>HEAD is now at previous state. Toggle back anytime with <code>/revert_branch</code>.</i>`;

    await replyWithFlavor(ctx, message, "positive");

  } catch (error) {
    console.error("❌ Branch revert error:", error);
    await replyWithFlavor(ctx, "Wah lau, branch swap failed! System unstable.", "negative");
  }
}

export function registerRevertBranchCommand(bot: Telegraf): void {
  bot.command("revert_branch", handleRevertBranchCommand);
}