import { Context, Telegraf } from "telegraf";
import * as queries from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * The Spill Command 
 * Vibe: PIPELINE PASSED / Final Simulation Report
 */
export async function handleSpillCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const mod = args[0];
  
  // 1. Get the Target (A, B+, or a number). Default to 'A' (80) if not provided.
  const targetInput = args[1] || "A";

  if (!mod) {
    await replyWithFlavor(ctx, "<b>⚠️ USAGE ERROR</b>\nUsage: <code>/spill &lt;MOD&gt; &lt;TARGET&gt;</code>", "negative");
    return;
  }

  try {
    const components = await queries.getModuleComponents(userId, mod);
    const progress = await queries.getModuleProgress(userId, mod);
    const profile = await queries.getStudentProfile(userId);
    
    if (!components || components.length === 0) {
      await replyWithFlavor(ctx, `Nothing to spill leh. Staging area for <b>${mod.toUpperCase()}</b> is empty!`, "casual");
      return;
    }

    // --- MATH SECTION ---
    const gradeMap: Record<string, number> = { "A": 80, "B+": 75, "B": 70, "C+": 65, "C": 60, "D+": 55, "D": 50 };
    const targetPoints = gradeMap[targetInput.toUpperCase()] || Number(targetInput) || 80;
    
    const securedPoints = Number(progress.securedPoints || 0);
    const totalWeightUsed = Number(progress.totalWeightUsed || 0);
    const remainingWeight = 100 - totalWeightUsed;
    
    // Calculate required average on remaining
    const pointsNeeded = targetPoints - securedPoints;
    const requiredAvg = (pointsNeeded / remainingWeight) * 100;

    // --- THE PIPELINE UI ---
    let spillMsg = `🚀 <b>PIPELINE PASSED:</b> 📊 <b>SIMULATION: ${mod.toUpperCase()}</b>\n`;
    
    // Log the latest component
    const latestComp = components[components.length - 1];
    spillMsg += `Component <b>${latestComp.component_name}</b> logged at 100% intensity. ✅\n\n`;

    spillMsg += `• <b>Secured:</b> ${securedPoints.toFixed(1)} / ${totalWeightUsed} pts\n`;
    spillMsg += `• <b>Target:</b> ${targetInput.toUpperCase()} (${targetPoints}% overall)\n`;
    spillMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;

    if (requiredAvg > 100) {
      spillMsg += `💀 <b>STATUS: FAILED</b>\nEven 100% on remaining can't hit target liao.`;
    } else if (requiredAvg <= 0) {
      spillMsg += `😎 <b>STATUS: SECURED</b>\nYou can literally 0% the rest and still hit target.`;
    } else {
      spillMsg += `👉 You need <b>${requiredAvg.toFixed(1)}%</b> on your remaining <b>${remainingWeight}%</b> weightage.\n`;
      spillMsg += `<i>(this message is agak agak)</i>\n`;
    }

    // --- CGPA SUMMARY (Footer) ---
    if (profile) {
      const gpa = Number(profile.totalGPA || 0).toFixed(2);
      spillMsg += `\n🖥️ <b>SYSTEM CGPA:</b> <code>${gpa}</code> | 🚀 <b>Production</b>`;
    }

    await replyWithFlavor(ctx, spillMsg, "positive");

  } catch (error) {
    console.error("❌ Spill Error:", error);
    await replyWithFlavor(ctx, "FAILED TO SPILL: Pipeline encountered an error.", "negative");
  }
}

export function registerSpillCommand(bot: Telegraf): void {
  bot.command("spill", handleSpillCommand);
  bot.command("kaypoh", handleSpillCommand);
}