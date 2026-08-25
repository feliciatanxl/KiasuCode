import { Context, Telegraf } from "telegraf";
import { getDatabase } from "../database/connection";
import { calculateSchoolGPA } from "../database/queries";
import { getScaleForSchool } from "../types";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Enhanced /copium Command
 * Usage: /copium 4:A 4:B+ 2:A
 * This allows you to simulate specific grades per module.
 */
export async function handleCopiumCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;
  if (!userId || !message || !("text" in message)) return;

  // 1. Get the arguments (e.g. ["4:A", "4:B+"])
  const args = message.text.split(/\s+/).slice(1);
  
  if (args.length === 0) {
    await replyWithFlavor(
      ctx, 
      "<b>⚠️ SIMULATION_ERROR: NO_DATA</b>\n" +
      "Usage: <code>/copium &lt;credits&gt;:&lt;grade&gt; ...</code>\n" +
      "Example: <code>/copium 4:A 4:B+ 2:A</code>", 
      "negative"
    );
    return;
  }

  const db = getDatabase();

  try {
    const [student]: any = await db.query("SELECT activeSchool FROM students WHERE userId = ?", [userId]);
    const school = student[0]?.activeSchool;

    if (!school) {
      await replyWithFlavor(ctx, "No active branch! <code>/checkout</code> first lor.", "negative");
      return;
    }

    const stats = await calculateSchoolGPA(userId, school);
    const scale = getScaleForSchool(school);

    let simulatedPoints = 0;
    let simulatedCredits = 0;
    let breakdown = "";

    // 2. Parse each module entry
    for (const arg of args) {
      const parts = arg.split(":");
      if (parts.length !== 2) continue;

      const credits = parseInt(parts[0], 10);
      const grade = parts[1].toUpperCase();

      // Validation: Check if credits is number and grade exists in current school scale
      if (isNaN(credits) || !(grade in scale.points)) {
        await replyWithFlavor(ctx, `<b>❌ INVALID_ENTRY:</b> <code>${arg}</code>\nGrade or credits not supported!`, "negative");
        return;
      }

      simulatedPoints += credits * scale.points[grade];
      simulatedCredits += credits;
      breakdown += `• <code>${credits} CR</code> ➜ <b>${grade}</b>\n`;
    }

    // 3. GPA Calculation
    const currentTotalPoints = stats.gpa * stats.credits;
    const finalGpa = (currentTotalPoints + simulatedPoints) / (stats.credits + simulatedCredits);

    // 4. Determine "Copium Level"
    const jump = finalGpa - stats.gpa;
    let level = "Low (Reasonable Hope)";
    if (jump > 0.4) level = "MEDIUM (Inhaling Hope)";
    if (jump > 0.8) level = "HIGH (Pure Copium 🚀)";

    // 5. Final UI
    let response = `<b>🧪 COPIUM_SIMULATOR v2.0</b>\n`;
    response += `<i>Scenario: Modular "Dream Build" Deployment</i>\n`;
    response += `<b>━━━━━━━━━━━━━━━━━━━━</b>\n\n`;

    response += `<b>[ DREAM_MODULES ]</b>\n${breakdown}\n`;

    response += `<b>[ FORECASTED_RESULT ]</b>\n`;
    response += `Current GPA: <code>${stats.gpa.toFixed(2)}</code>\n`;
    response += `<b>FINAL GPA: <u>${finalGpa.toFixed(2)}</u></b>\n`;
    response += `Simulation Credits: <code>${simulatedCredits} CR</code>\n`;
    response += `Copium Intake: <code>${level}</code>\n\n`;

    response += `<i>// Build status: INHALING HOPE... 🚀💨</i>`;

    await ctx.reply(response, { parse_mode: 'HTML' });

  } catch (error) {
    console.error("❌ Copium error:", error);
    await replyWithFlavor(ctx, "Simulation engine overheated lor!", "negative");
  }
}

export function registerCopiumCommand(bot: Telegraf): void {
  bot.command("copium", handleCopiumCommand);
  bot.command("forecast", handleCopiumCommand);
}