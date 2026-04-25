import { Context, Telegraf, Markup } from "telegraf";
import { getModuleGrade, patchModuleGrade } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";
import { GRADE_POINTS } from "../types";

export async function handlePatchCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;

  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const moduleCode = args[0]?.toUpperCase();

  if (!moduleCode) {
    await replyWithFlavor(ctx, "Usage: /patch <module_code>\nExample: /patch IT101", "negative");
    return;
  }

  const module = await getModuleGrade(userId, moduleCode);
  if (!module) {
    await replyWithFlavor(ctx, `Wah lau, ${moduleCode} not found in your repo!`, "negative");
    return;
  }

  // Send buttons to ask what to change
  await ctx.reply(
    `Editing *${moduleCode}*... what you want to change?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📝 Change Code", `edit_code:${moduleCode}`)],
        [Markup.button.callback("🔢 Change Credits", `edit_cred:${moduleCode}`)],
        [Markup.button.callback("🎯 Change Grade", `edit_grade:${moduleCode}`)]
      ])
    }
  );
}

export function registerPatchCommand(bot: Telegraf): void {
  bot.command("patch", handlePatchCommand);

  // Handle Button Clicks
  bot.action(/edit_(code|cred|grade):(.+)/, async (ctx) => {
    const field = ctx.match[1];
    const modCode = ctx.match[2];
    
    let prompt = "";
    if (field === "code") prompt = `Type the NEW module code for ${modCode}:`;
    if (field === "cred") prompt = `Type the NEW credit value for ${modCode} (1-4):`;
    if (field === "grade") prompt = `Type the NEW grade for ${modCode} (e.g. DIST, A, B+):`;

    await ctx.answerCbQuery();
    
    // Updated this line to use backticks for the command syntax
    await ctx.reply(
      `*Patching ${modCode}*\n${prompt}\n\n*Format:* \`/patch_val ${modCode} ${field} <value>\``, 
      { parse_mode: 'Markdown' }
    );
  });

  // Final step: Receive the new value
  bot.command("patch_val", async (ctx) => {
    const userId = ctx.from.id;
    const args = ctx.message.text.split(/\s+/).slice(1);
    if (args.length < 3) return;

    const [modCode, field, newValue] = args;
    const current = await getModuleGrade(userId, modCode);
    if (!current) return;

    let { moduleCode, creditValue, grade } = current;

    if (field === "code") moduleCode = newValue;
    if (field === "cred") creditValue = parseInt(newValue);
    if (field === "grade") grade = newValue.toUpperCase();

    const pointValue = GRADE_POINTS[grade] ?? current.pointValue;
    const result = await patchModuleGrade(userId, modCode, moduleCode, creditValue, grade, pointValue);

    if (result.success) {
      await replyWithFlavor(ctx, `✅ Hotfix deployed! ${modCode} updated to ${moduleCode}.`, "positive");
    } else {
      await replyWithFlavor(ctx, result.message, "negative");
    }
  });
}