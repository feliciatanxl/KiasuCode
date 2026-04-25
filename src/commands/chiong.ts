import { Context, Telegraf } from "telegraf";
import { getDatabase } from "../database/connection";
import { calculateSchoolGPA } from "../database/queries";
import { getScaleForSchool } from "../types";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * /chiong <upcoming_credits> <target_cgpa>
 * Calculates the "Error Budget" to see how much slack you have.
 */
export async function handleChiongCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const upcomingCredits = parseInt(args[0], 10);
  const targetGpa = parseFloat(args[1]);

  // 1. Validation Logic
  if (isNaN(upcomingCredits) || isNaN(targetGpa)) {
    await replyWithFlavor(
      ctx, 
      "<b>⚠️ CONFIG_ERROR: MISSING_PARAMS</b>\nUsage: <code>/chiong &lt;credits&gt; &lt;target_cgpa&gt;</code>\nExample: <code>/chiong 20 3.5</code>", 
      "negative"
    );
    return;
  }

  try {
    const db = getDatabase();
    const [student]: any = await db.query("SELECT activeSchool FROM students WHERE userId = ?", [userId]);
    const school = student[0]?.activeSchool;

    if (!school) {
      await replyWithFlavor(ctx, "No active branch! <code>/checkout</code> first lor.", "negative");
      return;
    }

    const stats = await calculateSchoolGPA(userId, school);
    const scale = getScaleForSchool(school);

    if (targetGpa > scale.max) {
      await replyWithFlavor(ctx, `Wah lau, ${targetGpa} is literally impossible on a ${scale.max.toFixed(1)} scale!`, "negative");
      return;
    }

    // 2. The "Chiong" Math (Weighted Average Algebra)
    const totalFutureCredits = stats.credits + upcomingCredits;
    const totalPointsNeeded = totalFutureCredits * targetGpa;
    const currentPoints = stats.gpa * stats.credits;
    const pointsRequiredThisSem = totalPointsNeeded - currentPoints;
    
    const maxPointsPossibleThisSem = upcomingCredits * scale.max;
    const errorBudget = maxPointsPossibleThisSem - pointsRequiredThisSem;

    // 3. UI Output
    let response = `<b>🚀 CHIONG_INDEX: SAFETY_MARGIN_REPORT</b>\n`;
    response += `<i>Target Floor: <b>${targetGpa.toFixed(2)} CGPA</b></i>\n`;
    response += `<b>━━━━━━━━━━━━━━━━━━━━</b>\n\n`;

    if (errorBudget < 0) {
      const maxPossible = (currentPoints + maxPointsPossibleThisSem) / totalFutureCredits;
      response += `<b>🚨 CRITICAL_LIMIT_EXCEEDED</b>\n`;
      response += `Even if you get straight 'A's, your max CGPA will only hit <code>${maxPossible.toFixed(2)}</code>.\n`;
      response += `<i>// System status: CHIONG ALSO NO USE. 💀</i>`;
    } else {
      response += `<b>✅ ERROR_BUDGET: <u>${errorBudget.toFixed(1)} Points</u></b>\n`;
      response += `You have a buffer of ${errorBudget.toFixed(1)} points across ${upcomingCredits} credits.\n\n`;
      
      // Calculate how many 'B' or 'C' grades fit in the budget (assuming 4CR mods)
      const bSlack = Math.floor(errorBudget / ( (scale.max - (scale.points['B'] || 3.0)) * 4) );
      const cSlack = Math.floor(errorBudget / ( (scale.max - (scale.points['C'] || 2.0)) * 4) );

      response += `<b>📊 SLACK_ALLOWANCE (If 4CR mods):</b>\n`;
      response += `• Can afford <b>${bSlack}</b> modules of 'B'\n`;
      response += `• OR <b>${cSlack}</b> modules of 'C'\n\n`;
      
      response += `<i>Build Status: STABLE 🛡️</i>\n`;
      response += `<i>"Relax a bit can, but don't slack too much!"</i>`;
    }

    await ctx.reply(response, { parse_mode: 'HTML' });

  } catch (error) {
    console.error("❌ Chiong crash:", error);
    await replyWithFlavor(ctx, "Chiong engine overheated during calculation!", "negative");
  }
}

export function registerChiongCommand(bot: Telegraf): void {
  bot.command("chiong", handleChiongCommand);
  bot.command("safety", handleChiongCommand);
  bot.command("margin", handleChiongCommand);
}