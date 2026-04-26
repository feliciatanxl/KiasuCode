import { Context, Telegraf } from "telegraf";
import * as queries from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * The Spill Command 
 * Vibe: Spilling the tea / Git Log style history
 */
export async function handleSpillCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const mod = args[0];

  if (!mod) {
    await replyWithFlavor(ctx, "<b>⚠️ USAGE ERROR</b>\nUsage: <code>/spill &lt;MOD&gt;</code> (e.g., /spill IT1111)", "negative");
    return;
  }

  try {
    // 1. Fetch Module Receipts & Student Profile
    const components: any[] = await queries.getModuleComponents(userId, mod);
    const progress = await queries.getModuleProgress(userId, mod);
    const profile = await queries.getStudentProfile(userId);
    
    if (!components || components.length === 0) {
      await replyWithFlavor(ctx, `Nothing to spill leh. Your staging area for <b>${mod.toUpperCase()}</b> is totally empty.`, "casual");
      return;
    }

    const securedPoints = Number(progress.securedPoints || 0);
    const totalWeightUsed = Number(progress.totalWeightUsed || 0);

    // 2. Build the "Receipt" (Git Log Aesthetic)
    let spillMsg = `☕ <b>SPILLING THE TEA: ${mod.toUpperCase()}</b>\n`;
    spillMsg += `<code>Branch: staging/history</code>\n`;
    spillMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;

    components.forEach((comp, index) => {
      const pts = Number(comp.points_contributed || 0).toFixed(1);
      const weight = Number(comp.weightage || 0);
      // Logic: formatted to look like a git log entry
      spillMsg += `[commit ${index + 1}] <b>${comp.component_name}</b>: +${pts} pts <i>(${weight}%)</i>\n`;
    });

    spillMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    spillMsg += `📊 <b>MODULE DAMAGE:</b>\n`;
    spillMsg += `• Secured: ${securedPoints.toFixed(1)} / ${totalWeightUsed}%\n`;
    
    const remainingWeight = 100 - totalWeightUsed;
    if (remainingWeight > 0) {
      spillMsg += `⏳ <b>Remaining:</b> ${remainingWeight}%\n\n`;
    } else {
      spillMsg += `🏁 <b>Status:</b> Deployment Complete. GG!\n\n`;
    }

    // 3. Add the CGPA Summary (The "Master Branch" Status)
    if (profile) {
      const gpa = Number(profile.totalGPA || 0).toFixed(2);
      spillMsg += `🖥️ <b>SYSTEM CGPA SUMMARY:</b>\n`;
      spillMsg += `• Current GPA: <code>${gpa}</code>\n`;
      spillMsg += `• Env: <b>Production</b> 🚀`;
    }

    await replyWithFlavor(ctx, spillMsg, "positive");

  } catch (error) {
    console.error("❌ Spill Error:", error);
    await replyWithFlavor(ctx, "Failed to pull the receipts. Database.exe stopped working.", "negative");
  }
}

/**
 * Register all Overview/Spill commands
 */
export function registerSpillCommand(bot: Telegraf): void {
  bot.command("spill", handleSpillCommand);     // The Tea
  bot.command("logs", handleSpillCommand);      // The Dev favorite
  bot.command("kaypoh", handleSpillCommand);    // The Singlish
  bot.command("status", handleSpillCommand);    // The System check
}