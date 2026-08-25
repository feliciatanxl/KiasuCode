import { Context, Telegraf, Markup } from "telegraf";
import * as queries from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handler for /flush command
 */
export async function handleFlushCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const mod = args[0];

  if (!mod) {
    await replyWithFlavor(ctx, "<b>⚠️ USAGE ERROR</b>\nFormat: <code>/flush &lt;MOD&gt;</code> or <code>/flush --all</code>", "negative");
    return;
  }

  let confirmMsg = "";
  let callbackData = "";

  if (mod.toLowerCase() === "--all") {
    confirmMsg = "⚠️ <b>GLOBAL PURGE REQUESTED</b>\nYou are about to wipe EVERY simulation in your staging area. Very destructive sia. Confirm?";
    callbackData = `flush_confirm:all`;
  } else {
    const progress = await queries.getModuleProgress(userId, mod);
    
    // HOTFIX: Cast MySQL string decimals to Numbers to prevent strict equality and type errors
    const totalWeightUsed = Number(progress.totalWeightUsed || 0);
    const securedPoints = Number(progress.securedPoints || 0);

    if (totalWeightUsed === 0) {
      await replyWithFlavor(ctx, `Nothing to flush for <b>${mod.toUpperCase()}</b> lor. Pipes already clean.`, "casual");
      return;
    }
    
    confirmMsg = 
      `⚠️ <b>FLUSH WARNING: ${mod.toUpperCase()}</b>\n` +
      `You are about to throw away <b>${securedPoints.toFixed(1)} points</b> secured across ${totalWeightUsed}% weightage.\n\n` +
      `Confirm you want to buang this simulation?`;
    callbackData = `flush_confirm:${mod.toUpperCase()}`;
  }

  // Send Confirmation Keyboard
  await ctx.replyWithHTML(confirmMsg, 
    Markup.inlineKeyboard([
      [Markup.button.callback("Yes, Flush it! 🚽", callbackData)],
      [Markup.button.callback("Wait, Abort! 🛑", "flush_abort")]
    ])
  );
}

/**
 * Handler for the Inline Buttons
 */
export async function handleFlushCallback(ctx: Context): Promise<void> {
  // Narrowing the type for callback query
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;
  
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  if (!userId || !data.startsWith("flush_")) return;

  if (data === "flush_abort") {
    await ctx.answerCbQuery("Flush Aborted.");
    await ctx.editMessageText("✅ <b>ABORTED:</b> Staging data preserved. Pipes are safe!");
    return;
  }

  const [_, target] = data.split(":");

  try {
    if (target === "all") {
      await queries.resetModuleComponents(userId);
      await ctx.answerCbQuery("Staging Purged!");
      await ctx.editMessageText("🧹 <b>GLOBAL PURGE COMPLETE:</b> Your staging environment is now a clean slate.");
    } else {
      await queries.resetModuleComponents(userId, target);
      await ctx.answerCbQuery(`${target} Flushed!`);
      await ctx.editMessageText(`🚽 <b>FLUSHED:</b> Simulation history for <code>${target}</code> has been cleared.`);
    }
  } catch (error) {
    console.error(error);
    await ctx.answerCbQuery("Flush failed!");
  }
}

/**
 * Register Flush & Callback handlers
 */
export function registerFlushCommand(bot: Telegraf): void {
  bot.command("flush", handleFlushCommand);
  bot.command("buang", handleFlushCommand);

  // Essential: Listen for the button clicks
  bot.on("callback_query", async (ctx, next) => {
    if (ctx.callbackQuery && "data" in ctx.callbackQuery && ctx.callbackQuery.data.startsWith("flush_")) {
      return await handleFlushCallback(ctx);
    }
    return next();
  });
}