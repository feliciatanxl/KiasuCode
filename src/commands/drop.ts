import { Context, Telegraf, Markup } from "telegraf";
import { removeModuleGrade } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /drop command (Smart Router)
 * Vibe: Removing records from the branch / Repository cleanup
 */
export async function handleDropCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);

  // 🌟 LEVEL 1: THE SMART MENU
  // If they just type "/drop", show the GUI buttons
  if (args.length === 0) {
    await ctx.reply(
      "🗑️ <b>What would you like to drop?</b>\nSelect the repository to clean up:",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("📚 Drop a Module", "btn_drop_module")],
          [Markup.button.callback("📅 Drop a Deadline", "btn_drop_deadline")]
        ])
      }
    );
    return;
  }

  // 🌟 LEVEL 2: DIRECT MODULE DROP
  // If they type "/drop IT1111", proceed with module removal logic
  const moduleCode = args[0]?.toUpperCase();

  try {
    const result = await removeModuleGrade(userId, moduleCode);

    if (result.success) {
      await replyWithFlavor(
        ctx, 
        `<b>✅ ROLLBACK SUCCESSFUL</b>\n\n` +
        `Module <code>${moduleCode}</code> has been moved to the Recycle Bin.`, 
        "positive"
      );
    } else {
      await replyWithFlavor(ctx, `<b>❌ DROP FAILED</b>\n${result.message}`, "negative");
    }
  } catch (error) {
    console.error("❌ Drop command error:", error);
    await replyWithFlavor(ctx, "<b>⚠️ MERGE CONFLICT</b>\nError dropping module lor!", "negative");
  }
}

/**
 * Register drop command handlers and button actions
 */
export function registerDropCommand(bot: Telegraf): void {
  bot.command("drop", handleDropCommand);
  bot.command("remove", handleDropCommand);
  bot.command("delete", handleDropCommand);

  // --- SMART MENU ROUTERS ---
  
  bot.action("btn_drop_module", async (ctx) => {
    await ctx.answerCbQuery(); 
    await ctx.reply("📚 <b>To drop a module:</b>\nType <code>/drop &lt;ModuleCode&gt;</code>\n\n<i>Example:</i> <code>/drop IT1111</code>", { parse_mode: "HTML" });
  });

  bot.action("btn_drop_deadline", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("📅 <b>To drop a deadline:</b>\nCheck your /pipeline for the Issue ID, then type:\n<code>/drop_issue &lt;IssueID&gt;</code>\n\n<i>Example:</i> <code>/drop_issue 2</code>", { parse_mode: "HTML" });
  });
}