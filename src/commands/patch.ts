import { Context, Telegraf, Markup } from "telegraf";
import { getModuleGrade, patchModuleGrade } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";
import { GRADING_SCALES } from "../types"; 

/**
 * Handle the /patch command (Smart Router)
 * Acts as both a GUI Menu and a direct CLI tool.
 */
export async function handlePatchCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;

  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);

  // 🌟 LEVEL 1: THE SMART MENU
  // If they just type "/patch" with no arguments, show the GUI buttons
  if (args.length === 0) {
    await ctx.reply(
      "🛠️ <b>What would you like to patch?</b>\nChoose a repository to hotfix:",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("📚 Patch a Module", "btn_patch_module")],
          [Markup.button.callback("📅 Patch a Deadline", "btn_patch_deadline")]
        ])
      }
    );
    return;
  }

  // 🌟 LEVEL 2: DIRECT MODULE TARGETING
  // If they type "/patch IT1111", skip the menu and target the module directly!
  const moduleCode = args[0]?.toUpperCase();

  const module = await getModuleGrade(userId, moduleCode);
  if (!module) {
    await replyWithFlavor(
      ctx, 
      `<b>❌ MODULE NOT FOUND</b>\n` +
      `Wah lau, <code>${moduleCode}</code> not found in your current branch!`, 
      "negative"
    );
    return;
  }

  // Send buttons to ask exactly what field to change
  const menuMessage = 
    `<b>🛠️ MODULE HOTFIX:</b> <code>${moduleCode}</code>\n` +
    `<i>Title: ${module.moduleName}</i>\n\n` +
    `What field do you want to patch in the repository?`;

  await ctx.reply(menuMessage, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📝 Change Code", `edit_code:${moduleCode}`)],
        [Markup.button.callback("🏷️ Change Name", `edit_name:${moduleCode}`)],
        [Markup.button.callback("🔢 Change Credits", `edit_cred:${moduleCode}`)],
        [Markup.button.callback("🎯 Change Grade", `edit_grade:${moduleCode}`)]
      ])
    }
  );
}

export function registerPatchCommand(bot: Telegraf): void {
  bot.command("patch", handlePatchCommand);

  // --- SMART MENU ROUTERS ---
  
  bot.action("btn_patch_module", async (ctx) => {
    await ctx.answerCbQuery(); 
    await ctx.reply("📚 <b>To patch a module:</b>\nType <code>/patch &lt;ModuleCode&gt;</code> to open the module's hotfix menu.\n\n<i>Example:</i> <code>/patch IT1111</code>", { parse_mode: "HTML" });
  });

  bot.action("btn_patch_deadline", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("📅 <b>To patch a deadline target:</b>\nCheck your /pipeline for the Issue ID, then use this format:\n<code>/patch_issue &lt;IssueID&gt; &lt;NewDate&gt; [NewTime]</code>\n\n<i>Example:</i> <code>/patch_issue 2 31/05/2026 23:59</code>", { parse_mode: "HTML" });
  });

  // --- GRANULAR MODULE FIELD ROUTERS ---

  bot.action(/edit_(code|name|cred|grade):(.+)/, async (ctx) => {
    const field = ctx.match[1];
    const modCode = ctx.match[2];
    
    let prompt = "";
    if (field === "code") prompt = "Type the <b>NEW module code</b>:";
    if (field === "name") prompt = "Type the <b>NEW module name</b>:";
    if (field === "cred") prompt = "Type the <b>NEW credit value</b> (1-6):";
    if (field === "grade") prompt = "Type the <b>NEW grade</b> (e.g. DIST, A, B+):";

    await ctx.answerCbQuery();
    
    const response = 
      `<b>🔧 PATCHING:</b> <code>${modCode}</code>\n` +
      `${prompt}\n\n` +
      `<b>Command:</b>\n<code>/patch_val ${modCode} ${field} &lt;value&gt;</code>`;

    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // --- FINAL COMMIT PHASE ---

  bot.command("patch_val", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const message = ctx.message;
    if (!message || !("text" in message)) return;

    const args = message.text.split(/\s+/).slice(1);
    if (args.length < 3) {
      await replyWithFlavor(ctx, "<b>⚠️ INVALID FORMAT</b>\nMissing patch values lor!", "negative");
      return;
    }

    const [modCode, field, ...valueParts] = args;
    const newValue = valueParts.join(" ");

    const current = await getModuleGrade(userId, modCode);
    if (!current) {
        await replyWithFlavor(ctx, `<b>❌ PATCH FAILED</b>\nCannot find <code>${modCode}</code> to patch!`, "negative");
        return;
    }

    let { moduleCode, moduleName, creditValue, grade, pointValue } = current;

    if (field === "code") moduleCode = newValue.toUpperCase();
    if (field === "name") moduleName = newValue;
    if (field === "cred") creditValue = parseInt(newValue, 10);
    
    if (field === "grade") {
      grade = newValue.toUpperCase();
      
      const schoolScale = GRADING_SCALES[current.school] || GRADING_SCALES.DEFAULT;
      
      if (!(grade in schoolScale.points)) {
        await replyWithFlavor(
          ctx, 
          `<b>❌ INVALID GRADE</b>\nGrade <code>${grade}</code> is not valid for the <b>${current.school}</b> scale!`, 
          "negative"
        );
        return;
      }
      pointValue = schoolScale.points[grade];
    }

    const result = await patchModuleGrade(
        userId, modCode, moduleCode, moduleName, creditValue, grade, pointValue
    );

    if (result.success) {
      await replyWithFlavor(
        ctx, 
        `<b>✅ HOTFIX DEPLOYED</b>\nModule <code>${modCode}</code> updated successfully in the branch.`, 
        "positive"
      );
    } else {
      await replyWithFlavor(ctx, `<b>❌ BUILD FAILED</b>\n${result.message}`, "negative");
    }
  });
}