import { Context, Telegraf } from "telegraf";
import { getStudentProfile } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

export async function handleGpaCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  
  if (!userId) {
    await replyWithFlavor(ctx, "Cannot identify user - merge conflict lor!", "negative");
    return;
  }

  try {
    const profile = await getStudentProfile(userId);

    // If no profile found or no modules committed yet
    if (!profile || profile.moduleCount === 0) {
      await replyWithFlavor(
        ctx, 
        "Wah lau, your repo is empty! Go `/commit` some grades first.", 
        "negative"
      );
      return;
    }

    // Format the response with bold Markdown
    const message = `
📊 *Academic Build Status*

Modules Committed: ${profile.moduleCount}
Current GPA: *${Number(profile.totalGPA).toFixed(2)}*

Repo status: STABLE ✅
    `.trim();

    await replyWithFlavor(ctx, message, "positive");
  } catch (error) {
    console.error("❌ GPA command error:", error);
    await replyWithFlavor(ctx, "Error fetching GPA lor!", "negative");
  }
}

/**
 * Register the /gpa command handler
 */
export function registerGpaCommand(bot: Telegraf): void {
  bot.command("gpa", handleGpaCommand);
}