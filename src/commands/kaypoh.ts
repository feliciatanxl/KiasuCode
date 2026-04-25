import { Context, Telegraf } from "telegraf";
import { getStudentHistory, getStudentProfile } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /kaypoh command
 * Now calculates Local GPA for the specific view!
 */
export async function handleHistoryCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const message = ctx.message;
  if (!message || !("text" in message)) return;

  try {
    const args = message.text.split(/\s+/).slice(1);
    const filterSchool = args[0]?.toUpperCase();
    const filterYear = args[1]?.toUpperCase();
    const filterSem = args[2]?.toUpperCase();

    const history = await getStudentHistory(userId, filterSchool, filterYear, filterSem);
    const profile = await getStudentProfile(userId);

    if (!history || history.length === 0) {
      const path = [filterSchool, filterYear, filterSem].filter(Boolean).join(" ➔ ");
      await replyWithFlavor(ctx, `Wah lau, no commits found in branch: *${path || "Global"}*!`, "negative");
      return;
    }

    let header = "📜 *Global Repository Overview*";
    if (filterSchool && filterYear && filterSem) header = `📂 *Repo: ${filterSchool} ➔ ${filterYear} ➔ ${filterSem}*`;
    else if (filterSchool && filterYear) header = `📂 *Repo: ${filterSchool} ➔ ${filterYear}*`;
    else if (filterSchool) header = `📂 *Repo: ${filterSchool} (All Terms)*`;

    let responseMessage = `${header}\n\n`;

    // Local stats variables
    let viewPoints = 0;
    let viewGradedCredits = 0;
    let viewTotalCredits = 0;

    history.forEach((mod, index) => {
      // 1. Calculate stats for the current view
      viewTotalCredits += mod.creditValue;
      if (mod.grade.toUpperCase() !== 'P') {
        viewPoints += mod.creditValue * mod.pointValue;
        viewGradedCredits += mod.creditValue;
      }

      // 2. Format the display
      const schoolTag = !filterSchool ? `[${mod.school}] ` : "";
      const branchTag = !filterSem ? `[${mod.academicYear} ${mod.semester}] ` : "";
      
      responseMessage += `${index + 1}. ${schoolTag}${branchTag}*${mod.moduleCode}* - ${mod.moduleName}\n` +
                         `   └─ ${mod.creditValue} CR ➔ Grade: *${mod.grade}*\n`;
    });

    responseMessage += `\n━━━━━━━━━━━━━━━━━━\n`;

    if (filterSchool || filterYear || filterSem) {
      // Calculate the GPA for just the modules in this list
      const viewGpa = viewGradedCredits > 0 ? (viewPoints / viewGradedCredits).toFixed(2) : "0.00";
      
      // Dynamic label: "Semester GPA", "Year GPA", or "Branch GPA"
      let gpaLabel = "Branch GPA";
      if (filterSem) gpaLabel = "Semester GPA";
      else if (filterYear) gpaLabel = "Year GPA";

      responseMessage += `Modules in View: ${history.length}\n`;
      responseMessage += `Credits in View: ${viewTotalCredits}\n`;
      responseMessage += `**${gpaLabel}: ${viewGpa}**\n`; // 🔥 The key update!
      responseMessage += `_Filtering active branch..._`;
    } else if (profile) {
      responseMessage += `Total Modules: ${profile.moduleCount}\n`;
      responseMessage += `Global CGPA: *${Number(profile.totalGPA).toFixed(2)}*\n`;
      responseMessage += `- code shiok shiok`;
    }

    await replyWithFlavor(ctx, responseMessage, "positive");

  } catch (error) {
    console.error("❌ History command error:", error);
    await replyWithFlavor(ctx, "Merge conflict while fetching history lor!", "negative");
  }
}

export function registerKaypohCommand(bot: Telegraf): void {
  bot.command("history", handleHistoryCommand);
  bot.command("list", handleHistoryCommand); 
  bot.command("log", handleHistoryCommand);
  bot.command("kepo", handleHistoryCommand);
  bot.command("kaypoh", handleHistoryCommand);
}