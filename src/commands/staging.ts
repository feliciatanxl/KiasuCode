import { Context, Telegraf, Markup } from "telegraf";
import { handleSalahCommand } from "./agak_agak";

export async function handleStagingMenu(ctx: Context): Promise<void> {
  const menuMsg = `🧪 <b>STAGING SANDBOX</b>\nForecast your targets, stress-test your GPA, and inhale Copium:`;
  await ctx.reply(menuMsg, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🧪 Agak Agak (Forecast)", "btn_stg_agak"), Markup.button.callback("☕ Spill Tea (View)", "btn_stg_spill")],
      [Markup.button.callback("🚀 Copium Simulator", "btn_stg_copium"), Markup.button.callback("🛡️ Chiong Safety", "btn_stg_chiong")],
      [Markup.button.callback("🔙 Salah (Undo Last)", "btn_stg_salah"), Markup.button.callback("🚽 Flush Area", "btn_stg_flush")]
    ])
  });
}

export function registerStagingCommand(bot: Telegraf): void {
  bot.command("staging", handleStagingMenu);
  bot.command("sandbox", handleStagingMenu);

  // Usage Guides
  bot.action("btn_stg_agak", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("🧪 <b>To forecast a module:</b>\nType: <code>/agak_agak &lt;MOD&gt; &lt;NAME&gt; &lt;SCORE&gt; &lt;WEIGHT%&gt; [TARGET%]</code>\n\n<i>Example:</i> <code>/agak_agak IT1234 Quiz 18/20 20</code>", { parse_mode: 'HTML' });
  });

  bot.action("btn_stg_spill", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("☕ <b>To view your staging breakdown:</b>\nType: <code>/spill &lt;MOD&gt; [TARGET]</code>\n\n<i>Example:</i> <code>/spill IT1234 A</code>", { parse_mode: 'HTML' });
  });

  bot.action("btn_stg_copium", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("🚀 <b>To simulate future grades:</b>\nType: <code>/copium &lt;credits&gt;:&lt;grade&gt; ...</code>\n\n<i>Example:</i> <code>/copium 4:A 4:B+ 2:A</code>", { parse_mode: 'HTML' });
  });

  bot.action("btn_stg_chiong", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("🛡️ <b>To calculate your safety margin:</b>\nType: <code>/chiong &lt;credits_left&gt; &lt;target_cgpa&gt;</code>\n\n<i>Example:</i> <code>/chiong 20 3.5</code>", { parse_mode: 'HTML' });
  });

  bot.action("btn_stg_flush", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("🚽 <b>To purge the staging area:</b>\nType: <code>/flush &lt;MOD&gt;</code> or <code>/flush --all</code>", { parse_mode: 'HTML' });
  });

  // Direct Execution
  bot.action("btn_stg_salah", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("To undo the last agak_agak entry, type: <code>/salah &lt;MOD&gt;</code>", { parse_mode: 'HTML' });
  });
}