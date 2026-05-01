import { Context, Telegraf } from "telegraf";
import * as queries from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Helper function to parse multiple date formats and optional times
 */
function parseFlexibleDate(input: string): Date {
  // 1. Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
  let normalized = input.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, '$3-$2-$1');
  
  // 2. If no time is provided, default to 11:59 PM
  if (!normalized.includes(':')) {
    normalized += ' 23:59:00';
  }

  // 🌟 THE FIX: Force the string to be interpreted as Singapore Time (UTC+8)
  // We append '+08:00' to the end of the string
  return new Date(`${normalized}+08:00`);
}

/**
 * Handle /deadline: Open a new issue
 */
export async function handleDeadlineCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  if (args.length < 2) {
    await replyWithFlavor(ctx, "<b>⚠️ USAGE ERROR</b>\nUsage: <code>/deadline &lt;TaskName&gt; &lt;Date&gt; [Time]</code>", "negative");
    return;
  }

  const taskName = args[0];
  const rawDateInput = args.slice(1).join(" "); 

  try {
    const dueDate = parseFlexibleDate(rawDateInput);
    if (isNaN(dueDate.getTime())) throw new Error("Invalid Date");

    await queries.addDeadline(userId, taskName, dueDate);
    
    const displayDate = dueDate.toLocaleString('en-SG', { 
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' 
    });

    await replyWithFlavor(ctx, `✅ <b>ISSUE OPENED:</b> ${taskName.replace(/_/g, " ")}\n🎯 Target: <code>${displayDate}</code>`, "positive");
  } catch (error) {
    await replyWithFlavor(ctx, "Failed to open issue. Check your date format!", "negative");
  }
}

/**
 * Handle /drop_issue: Surgical removal by ID (Option 2 logic)
 */
export async function handleDropIssue(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const issueId = parseInt(args[0], 10); // 🌟 Parses the ID number

  if (isNaN(issueId)) {
    await replyWithFlavor(ctx, "<b>⚠️ USAGE ERROR</b>\nUsage: <code>/drop_issue &lt;IssueID&gt;</code>\nCheck /pipeline for the ID!", "negative");
    return;
  }

  const success = await queries.removeDeadline(userId, issueId);
  if (success) {
    await replyWithFlavor(ctx, `🗑️ <b>ISSUE #${issueId} DROPPED</b>\nPipeline record cleared.`, "positive");
  } else {
    await replyWithFlavor(ctx, `❌ Could not find an active Issue <b>#${issueId}</b>.`, "negative");
  }
}

/**
 * Handle /patch_issue: Surgical update by ID
 */
export async function handlePatchIssue(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const issueId = parseInt(args[0], 10);

  if (isNaN(issueId) || args.length < 2) {
    await replyWithFlavor(ctx, "<b>⚠️ USAGE ERROR</b>\nUsage: <code>/patch_issue &lt;IssueID&gt; &lt;NewDate&gt;</code>", "negative");
    return;
  }

  const rawDateInput = args.slice(1).join(" ");

  try {
    const newDueDate = parseFlexibleDate(rawDateInput);
    if (isNaN(newDueDate.getTime())) throw new Error("Invalid Date");

    const success = await queries.updateDeadline(userId, issueId, newDueDate);
    if (success) {
      const displayDate = newDueDate.toLocaleString('en-SG', { 
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' 
      });
      await replyWithFlavor(ctx, `🔧 <b>ISSUE #${issueId} PATCHED</b>\nNew Target: <code>${displayDate}</code>`, "positive");
    } else {
      await replyWithFlavor(ctx, `❌ Could not find Issue <b>#${issueId}</b>.`, "negative");
    }
  } catch (error) {
    await replyWithFlavor(ctx, "Failed to patch issue. Check your date format!", "negative");
  }
}

/**
 * Register all deadline-related listeners
 */
export function registerDeadlineCommand(bot: Telegraf): void {
  bot.command("deadline", handleDeadlineCommand);
  bot.command("milestone", handleDeadlineCommand);
  
  // 🌟 MISSING LISTENERS ADDED HERE:
  bot.command("drop_issue", handleDropIssue);
  bot.command("patch_issue", handlePatchIssue);
}