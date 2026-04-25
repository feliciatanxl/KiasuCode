import { Context, Telegraf } from "telegraf";
import { getStudentHistory, getStudentProfile } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /kaypoh command
 * Now with enhanced HTML Dashboard UI!
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
      const path = [filterSchool, filterYear, filterSem].filter(Boolean).join(" ➜ ");
      await replyWithFlavor(
        ctx, 
        `<b>⚠️ EMPTY DIRECTORY</b>\nNo commits found in branch: <code>${path || "Global"}</code>!`, 
        "negative"
      );
      return;
    }

    // 1. Refactored Header Logic (HTML Style)
    let header = "📜 <b>Global Repository Overview</b>";
    if (filterSchool && filterYear && filterSem) header = `📂 <b>Repo: ${filterSchool} ➜ ${filterYear} ➜ ${filterSem}</b>`;
    else if (filterSchool && filterYear) header = `📂 <b>Repo: ${filterSchool} ➜ ${filterYear}</b>`;
    else if (filterSchool) header = `📂 <b>Repo: ${filterSchool} (All Terms)</b>`;

    let responseMessage = `${header}\n\n`;

    let viewPoints = 0;
    let viewGradedCredits = 0;
    let viewTotalCredits = 0;

    // 2. Loop with cleaner UI structure
    history.forEach((mod, index) => {
      viewTotalCredits += mod.creditValue;
      if (mod.grade.toUpperCase() !== 'P') {
        viewPoints += mod.creditValue * mod.pointValue;
        viewGradedCredits += mod.creditValue;
      }

      const schoolTag = !filterSchool ? `<b>[${mod.school}]</b> ` : "";
      const branchTag = !filterSem ? `<b>[${mod.academicYear} ${mod.semester}]</b> ` : "";
      
      // Formatting: Index. [TAGS] CODE - NAME (Bolded)
      responseMessage += `${index + 1}. ${schoolTag}${branchTag}<code>${mod.moduleCode}</code>\n` +
                         `   <b>${mod.moduleName}</b>\n` +
                         `   └─ ${mod.creditValue} CR ➜ Grade: <b>${mod.grade}</b>\n\n`;
    });

    responseMessage += `<b>━━━━━━━━━━━━━━━━━━</b>\n`;

    // 3. Stats section glow-up
    if (filterSchool || filterYear || filterSem) {
      const viewGpa = viewGradedCredits > 0 ? (viewPoints / viewGradedCredits).toFixed(2) : "0.00";
      
      let gpaLabel = "Branch GPA";
      if (filterSem) gpaLabel = "Semester GPA";
      else if (filterYear) gpaLabel = "Year GPA";

      responseMessage += `📦 Modules in View: <code>${history.length}</code>\n`;
      responseMessage += `📜 Credits in View: <code>${viewTotalCredits}</code>\n`;
      responseMessage += `🏆 <b>${gpaLabel}: <u>${viewGpa}</u></b>\n\n`;
      responseMessage += `<i>- Filtering active branch -</i>`;
    } else if (profile) {
      responseMessage += `📦 Total Modules: <code>${profile.moduleCount}</code>\n`;
      responseMessage += `🏆 Global CGPA: <u><b>${Number(profile.totalGPA).toFixed(2)}</b></u>\n\n`;
      responseMessage += `<i>- code shiok shiok -</i>`;
    }

    await replyWithFlavor(ctx, responseMessage, "positive");

  } catch (error) {
    console.error("❌ History command error:", error);
    await replyWithFlavor(ctx, "<b>⚠️ MERGE CONFLICT</b>\nError fetching history lor!", "negative");
  }
}

export function registerKaypohCommand(bot: Telegraf): void {
  bot.command("history", handleHistoryCommand);
  bot.command("list", handleHistoryCommand); 
  bot.command("log", handleHistoryCommand);
  bot.command("kepo", handleHistoryCommand);
  bot.command("kaypoh", handleHistoryCommand);
}