import { Context, Telegraf } from "telegraf";
import * as queries from "../database/queries";
import { GRADE_THRESHOLDS } from "../types"; 
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Main Simulation Command
 * Vibe: Staging environment for GPA forecasting
 */
export async function handleAgakAgakCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);

  // Usage: /agak_agak <MOD> <NAME> <SCORE> <WEIGHT> [TARGET]
  if (args.length < 4) {
    await replyWithFlavor(ctx, "<b>⚠️ USAGE ERROR</b>\nFormat: <code>/agak_agak &lt;MOD&gt; &lt;NAME&gt; &lt;SCORE&gt; &lt;WEIGHT%&gt; [TARGET%]</code>", "negative");
    return;
  }

  const [mod, name, rawScore, rawWeight, rawTarget] = args;
  const weight = parseFloat(rawWeight);
  const targetPercentage = rawTarget ? parseFloat(rawTarget) : 80; // Default to 'A' (80%)
  
  if (isNaN(weight)) {
    await replyWithFlavor(ctx, "Eh, the weightage must be a number leh! (e.g., 20)", "negative");
    return;
  }

  let achievedPercentage = 0;

  // 1. Convert Input to Percentage (Handles 18/20 or B+)
  if (rawScore.includes('/')) {
    const [score, max] = rawScore.split('/').map(Number);
    if (max === 0 || isNaN(score) || isNaN(max)) {
      achievedPercentage = 0; 
    } else {
      achievedPercentage = (score / max);
    }
  } else {
    const baseline = GRADE_THRESHOLDS[rawScore.toUpperCase()];
    if (baseline === undefined) {
      await replyWithFlavor(ctx, "Wah lau, what grade is that? Use 18/20 or B+ format lor.", "negative");
      return;
    }
    achievedPercentage = baseline / 100;
  }

  const contributedPoints = achievedPercentage * weight;

  if (isNaN(contributedPoints)) {
    await replyWithFlavor(ctx, "<b>⚠️ CALCULATION ERROR</b>\nCheck your input numbers again lor, math not working!", "negative");
    return;
  }

  try {
    // 2. Commit to staging (Database)
    await queries.addModuleComponent(userId, mod, name, contributedPoints, weight);
    const progress = await queries.getModuleProgress(userId, mod);
    
    const remainingWeight = 100 - progress.totalWeightUsed;
    
    // 3. Handle Final Staging (When weight hits 100%)
    if (remainingWeight <= 0) {
      const finalResult = progress.securedPoints >= targetPercentage ? "PASSED ✅" : "FAILED ❌";
      await replyWithFlavor(ctx, `📊 <b>FINAL STAGING: ${mod.toUpperCase()}</b>\n\nTotal Secured: ${progress.securedPoints.toFixed(1)}/100\nTarget: ${targetPercentage}%\n\nResult: ${finalResult}`, "positive");
      return;
    }

    // 4. Calculate needed marks for the remaining weightage
    const neededOnRemaining = ((targetPercentage - progress.securedPoints) / remainingWeight) * 100;

    const response = 
      `📊 <b>SIMULATION: ${mod.toUpperCase()}</b>\n` +
      `Component <code>${name}</code> logged at <b>${(achievedPercentage * 100).toFixed(0)}%</b> intensity. ✅\n\n` +
      `<b>Secured:</b> ${progress.securedPoints.toFixed(1)} / ${progress.totalWeightUsed} pts\n` +
      `<b>Target:</b> ${targetPercentage}% overall\n\n` +
      `👉 You need <b>${neededOnRemaining.toFixed(1)}%</b> on your remaining ${remainingWeight}% weightage.`;

    await replyWithFlavor(ctx, response, "positive");

  } catch (error) {
    console.error("❌ Agak-Agak Error:", error);
    await replyWithFlavor(ctx, "Simulation failed! Brain.exe stopped working.", "negative");
  }
}

/**
 * SALAH COMMAND: The "Oops" button for simulation errors
 * Vibe: git reset HEAD^ (but for staging)
 */
export async function handleSalahCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const mod = args[0];

  if (!mod) {
    await replyWithFlavor(ctx, "Usage: <code>/salah &lt;MOD&gt;</code>", "negative");
    return;
  }

  const success = await queries.undoModuleComponent(userId, mod);
  if (success) {
    await replyWithFlavor(
      ctx, 
      `♻️ <b>SALAH FIX:</b> Last component for <code>${mod.toUpperCase()}</code> has been popped from the stack. Staging is clean!`, 
      "positive"
    );
  } else {
    await replyWithFlavor(ctx, "Nothing to fix leh. Your history for this mod is already empty.", "casual");
  }
}

/**
 * Register all Staging-related commands
 */
export function registerAgakAgakCommand(bot: Telegraf): void {
  bot.command("agak_agak", handleAgakAgakCommand);
  bot.command("simulate", handleAgakAgakCommand);
  bot.command("salah", handleSalahCommand);
  bot.command("undo", handleSalahCommand); // Standard dev shortcut
}