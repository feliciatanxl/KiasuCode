import { Context, Telegraf, Markup } from "telegraf";
import { getModuleGrade, patchModuleGrade } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";
import { GRADE_POINTS } from "../types";

/**
 * Handle the /patch command
 * Opens the interactive menu to select which field to hotfix
 */
export async function handlePatchCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;

  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const moduleCode = args[0]?.toUpperCase();

  if (!moduleCode) {
    await replyWithFlavor(ctx, "Usage: `/patch <module_code>`\nExample: `/patch IT101`", "negative");
    return;
  }

  const module = await getModuleGrade(userId, moduleCode);
  if (!module) {
    await replyWithFlavor(ctx, `Wah lau, ${moduleCode} not found in your current branch!`, "negative");
    return;
  }

  // Send buttons to ask what to change - Now with Name support!
  await ctx.reply(
    `Editing *${moduleCode}* (${module.moduleName})... what you want to change?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📝 Change Code", `edit_code:${moduleCode}`)],
        [Markup.button.callback("🏷️ Change Name", `edit_name:${moduleCode}`)], // Added this lor!
        [Markup.button.callback("🔢 Change Credits", `edit_cred:${moduleCode}`)],
        [Markup.button.callback("🎯 Change Grade", `edit_grade:${moduleCode}`)]
      ])
    }
  );
}

export function registerPatchCommand(bot: Telegraf): void {
  bot.command("patch", handlePatchCommand);

  // Handle Button Clicks
  bot.action(/edit_(code|name|cred|grade):(.+)/, async (ctx) => {
    const field = ctx.match[1];
    const modCode = ctx.match[2];
    
    let prompt = "";
    if (field === "code") prompt = `Type the NEW module code for ${modCode}:`;
    if (field === "name") prompt = `Type the NEW name for ${modCode}:`;
    if (field === "cred") prompt = `Type the NEW credit value for ${modCode} (1-6):`;
    if (field === "grade") prompt = `Type the NEW grade for ${modCode} (e.g. DIST, A, B+):`;

    await ctx.answerCbQuery();
    
    await ctx.reply(
      `*Patching ${modCode}*\n${prompt}\n\n*Format:* \`/patch_val ${modCode} ${field} <value>\``, 
      { parse_mode: 'Markdown' }
    );
  });

  // Final step: Receive the new value and deploy hotfix
  bot.command("patch_val", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const message = ctx.message;
    if (!message || !("text" in message)) return;

    const args = message.text.split(/\s+/).slice(1);
    if (args.length < 3) return;

    const [modCode, field, ...valueParts] = args;
    const newValue = valueParts.join(" "); // Handles names with multiple words

    const current = await getModuleGrade(userId, modCode);
    if (!current) {
        await replyWithFlavor(ctx, `Cannot find ${modCode} to patch!`, "negative");
        return;
    }

    // Prepare current values as baseline
    let { moduleCode, moduleName, creditValue, grade, pointValue } = current;

    // Apply the specific patch
    if (field === "code") moduleCode = newValue.toUpperCase();
    if (field === "name") moduleName = newValue;
    if (field === "cred") creditValue = parseInt(newValue, 10);
    if (field === "grade") {
      grade = newValue.toUpperCase();
      pointValue = GRADE_POINTS[grade] ?? current.pointValue;
    }

    // 🔥 THE FIX: Calling with all 7 arguments in the correct order
    const result = await patchModuleGrade(
        userId, 
        modCode, 
        moduleCode, 
        moduleName, 
        creditValue, 
        grade, 
        pointValue
    );

    if (result.success) {
      await replyWithFlavor(ctx, `✅ Hotfix deployed! *${modCode}* updated successfully.`, "positive");
    } else {
      await replyWithFlavor(ctx, result.message, "negative");
    }
  });
}