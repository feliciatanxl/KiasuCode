import { Context, Telegraf } from "telegraf";
import * as queries from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * The Pipeline Command
 * Vibe: Issue Tracker / Kanban Board Overview
 */
export async function handlePipelineCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const deadlines = await queries.getUserDeadlines(userId);

    // If they have no tasks, give them a nice success message
    if (deadlines.length === 0) {
      await replyWithFlavor(ctx, "✅ <b>PIPELINE CLEAR</b>\nNo active deployments scheduled. You can finally touch grass.", "positive");
      return;
    }

    let msg = "📋 <b>ACTIVE PIPELINE ISSUES</b>\n\n";
    
    deadlines.forEach((issue) => {
      const dateObj = new Date(issue.due_date);
      
      // Format it as: "Sun, 31 May, 11:59 pm"
      const displayDate = dateObj.toLocaleString('en-SG', { 
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Singapore'
      });

      // Calculate how many days are left
      const now = new Date();
      const diffMs = dateObj.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      // Urgency Logic
      let urgency = "🟢"; // Chill
      if (diffDays <= 0) urgency = "🚨"; // Overdue!
      else if (diffDays <= 3) urgency = "🔴"; // Panic
      else if (diffDays <= 7) urgency = "🟡"; // Warning

      // Senior Dev Logic: Handle overdue strings gracefully
      const countdownText = diffDays > 0 ? `${diffDays} days left` : `OVERDUE!`;

      msg += `${urgency} <b>[Issue #${issue.id}] ${issue.task_name.replace(/_/g, " ")}</b>\n`;
      msg += `   └ 📅 ${displayDate} <i>(${countdownText})</i>\n\n`;
    });

    await ctx.reply(msg, { parse_mode: "HTML" });

  } catch (error) {
    console.error("❌ Pipeline Error:", error);
    await replyWithFlavor(ctx, "Failed to fetch pipeline status. Database down?", "negative");
  }
}

export function registerPipelineCommand(bot: Telegraf): void {
  bot.command("pipeline", handlePipelineCommand);
  bot.command("tasks", handlePipelineCommand);
}