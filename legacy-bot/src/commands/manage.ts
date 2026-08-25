import { Context, Telegraf, Markup } from "telegraf";
import { handleDropCommand } from "./drop";
import { handlePatchCommand } from "./patch";

export async function handleManageMenu(ctx: Context): Promise<void> {
  const menuMsg = `🛠️ <b>PRODUCTION ENVIRONMENT</b>\nManage your active branch, modules, and deadlines:`;
  await ctx.reply(menuMsg, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🚀 Commit Grade", "btn_mgr_commit"), Markup.button.callback("🔀 Switch Branch", "btn_mgr_checkout")],
      [Markup.button.callback("📅 Add Deadline", "btn_mgr_deadline")],
      [Markup.button.callback("🗑️ Drop/Remove", "btn_mgr_drop"), Markup.button.callback("🔧 Patch/Hotfix", "btn_mgr_patch")]
    ])
  });
}

export function registerManageCommand(bot: Telegraf): void {
  bot.command("manage", handleManageMenu);

  bot.action("btn_mgr_commit", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("🚀 <b>To deploy a grade:</b>\nType: <code>/commit &lt;CODE&gt; &lt;CR&gt; &lt;GRADE&gt; &lt;NAME&gt;</code>\n\n<i>Example:</i> <code>/commit IT1111 4 A Programming</code>", { parse_mode: 'HTML' });
  });

  bot.action("btn_mgr_checkout", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("🔀 <b>To switch your repo branch:</b>\nType: <code>/checkout &lt;SCHOOL&gt; &lt;YEAR&gt; &lt;SEM&gt;</code>\n\n<i>Example:</i> <code>/checkout NYP Y1 S1</code>", { parse_mode: 'HTML' });
  });

  bot.action("btn_mgr_deadline", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("📅 <b>To add a task/exam to the pipeline:</b>\nType: <code>/deadline &lt;TaskName&gt; &lt;Date&gt; [Time]</code>\n\n<i>Example:</i> <code>/deadline Math_Exam 25/05/2026 09:00</code>", { parse_mode: 'HTML' });
  });

  // These route directly to your existing smart menus!
  bot.action("btn_mgr_drop", async (ctx) => {
    await ctx.answerCbQuery();
    (ctx as any).message = { text: '/drop' };
    await handleDropCommand(ctx);
  });

  bot.action("btn_mgr_patch", async (ctx) => {
    await ctx.answerCbQuery();
    (ctx as any).message = { text: '/patch' };
    await handlePatchCommand(ctx);
  });
}