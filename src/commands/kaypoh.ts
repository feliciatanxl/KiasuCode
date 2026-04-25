import { Context, Telegraf } from "telegraf";
import { getStudentHistory, getStudentProfile } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /kaypoh command
 * Displays a full log of all committed modules
 */
export async function handleHistoryCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const history = await getStudentHistory(userId);
    const profile = await getStudentProfile(userId);

    if (!history || history.length === 0) {
      await replyWithFlavor(
        ctx, 
        "Wah lau, your repo is completely empty! Run `/commit` to add some modules first.", 
        "negative"
      );
      return;
    }

    // Build the summary message
    let message = `📜 *Academic Commit History*\n\n`;

    history.forEach((mod, index) => {
      // Format: 1. IT101 [4 CR] ➔ Grade: A
      message += `${index + 1}. *${mod.moduleCode}* [${mod.creditValue} CR] ➔ Grade: *${mod.grade}*\n`;
    });

    // Append the final build stats at the bottom
    if (profile) {
      message += `\n━━━━━━━━━━━━━━━━━━\n`;
      message += `Total Modules: ${profile.moduleCount}\n`;
      message += `Current GPA: *${Number(profile.totalGPA).toFixed(2)}*\n`;
    }

    await replyWithFlavor(ctx, message, "positive");
  } catch (error) {
    console.error("❌ History command error:", error);
    await replyWithFlavor(ctx, "Merge conflict while fetching history lor!", "negative");
  }
}

/**
 * Register kaypoh command handlers
 * We map ALL these words to the exact same function!
 */
export function registerKaypohCommand(bot: Telegraf): void {
  bot.command("history", handleHistoryCommand);
  bot.command("list", handleHistoryCommand); 
  bot.command("log", handleHistoryCommand);    // The Git way
  bot.command("kepo", handleHistoryCommand);   // Short spelling
  bot.command("kaypoh", handleHistoryCommand); // Long spelling - This fixes your bug!
}