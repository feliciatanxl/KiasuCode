import { Context, Telegraf } from "telegraf";
import * as queries from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * The Spill Command 
 * Aesthetic: Git Log + Pipeline Report
 */
export async function handleSpillCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const mod = args[0];
  
  // Default target is 'A' (80) if not specified
  const targetInput = args[1] || "A";

  if (!mod) {
    await replyWithFlavor(ctx, "<b>⚠️ USAGE ERROR</b>\nUsage: <code>/spill &lt;MOD&gt; &lt;TARGET&gt;</code>", "negative");
    return;
  }

  try {
    // 1. Fetch Data
    const components: any[] = await queries.getModuleComponents(userId, mod);
    const progress = await queries.getModuleProgress(userId, mod);
    const profile = await queries.getStudentProfile(userId);
    
    if (!components || components.length === 0) {
      await replyWithFlavor(ctx, `Nothing to spill leh. Staging area for <b>${mod.toUpperCase()}</b> is empty!`, "casual");
      return;
    }

    // 2. Math Processing
    const gradeMap: Record<string, number> = { "A": 80, "B+": 75, "B": 70, "C+": 65, "C": 60, "D+": 55, "D": 50 };
    const targetPoints = gradeMap[targetInput.toUpperCase()] || Number(targetInput) || 80;
    
    const securedPoints = Number(progress.securedPoints || 0);
    const totalWeightUsed = Number(progress.totalWeightUsed || 0);
    const remainingWeight = 100 - totalWeightUsed;
    const pointsNeeded = targetPoints - securedPoints;
    const requiredAvg = (pointsNeeded / remainingWeight) * 100;

    // 3. Build UI
    let spillMsg = `☕️ <b>SPILLING THE TEA: ${mod.toUpperCase()}</b>\n`;
    spillMsg += `<code>Branch: staging/history</code>\n`;
    spillMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;

    // Commit History Section
    components.forEach((comp, index) => {
      const pts = Number(comp.points_contributed || 0).toFixed(1);
      const weight = Number(comp.weightage || 0);
      spillMsg += `[commit ${index + 1}] <b>${comp.component_name}</b>: +${pts} pts (<i>${weight}%</i>)\n`;
    });

    spillMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    spillMsg += `📊 <b>MODULE DAMAGE:</b>\n`;
    spillMsg += `• Secured: ${securedPoints.toFixed(1)} / ${totalWeightUsed}%\n`;
    spillMsg += `• Remaining: ${remainingWeight}%\n\n`;

    // Pipeline Analysis Section
    spillMsg += `🚀 <b>PIPELINE ANALYSIS:</b>\n`;
    spillMsg += `Target: <b>${targetInput.toUpperCase()}</b> (${targetPoints}%)\n`;

    if (requiredAvg > 100) {
      spillMsg += `💀 <b>STATUS: FAILED</b>\nEven 100% on remaining can't hit target liao.\n`;
    } else if (requiredAvg <= 0) {
      spillMsg += `😎 <b>STATUS: SECURED</b>\nYou can 0% the rest and still hit target.\n`;
    } else {
      spillMsg += `👉 You need <b>${requiredAvg.toFixed(1)}%</b> on your remaining <b>${remainingWeight}%</b> weightage.\n`;
      spillMsg += `<i>(this message is agak agak)</i>\n`;
    }

    // 4. CGPA Summary Footer
    if (profile) {
      const gpa = Number(profile.totalGPA || 0).toFixed(2);
      spillMsg += `\n🖥️ <b>SYSTEM CGPA SUMMARY:</b>\n`;
      spillMsg += `• Current GPA: <code>${gpa}</code>\n`;
      spillMsg += `• Env: <b>Production</b> 🚀\n\n`;
    }

    spillMsg += `<i>- commit accepted -</i>`;

    await ctx.replyWithHTML(spillMsg);

  } catch (error) {
    console.error("❌ Spill Error:", error);
    await replyWithFlavor(ctx, "FAILED TO SPILL: Database.exe encountered a segmentation fault.", "negative");
  }
}

export function registerSpillCommand(bot: Telegraf): void {
  bot.command("spill", handleSpillCommand);
  bot.command("kaypoh", handleSpillCommand);
  bot.command("logs", handleSpillCommand);
}