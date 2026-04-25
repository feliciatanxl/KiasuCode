import { Context, Telegraf, Markup } from "telegraf";
import { getStudentHistory, getStudentProfile } from "../database/queries";
import { getDatabase } from "../database/connection";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Logic to generate the history report string
 */
async function generateKaypohReport(userId: number, filterSchool?: string, filterYear?: string, filterSem?: string) {
  const history = await getStudentHistory(userId, filterSchool, filterYear, filterSem);
  const profile = await getStudentProfile(userId);

  if (!history || history.length === 0) {
    const path = [filterSchool, filterYear, filterSem].filter(Boolean).join(" ➜ ");
    return `<b>⚠️ EMPTY DIRECTORY</b>\nNo commits found in branch: <code>${path || "Global"}</code>!`;
  }

  let header = "📜 <b>Global Repository Overview</b>";
  if (filterSchool && filterYear && filterSem) header = `📂 <b>Repo: ${filterSchool} ➜ ${filterYear} ➜ ${filterSem}</b>`;
  else if (filterSchool && filterYear) header = `📂 <b>Repo: ${filterSchool} ➜ ${filterYear}</b>`;
  else if (filterSchool) header = `📂 <b>Repo: ${filterSchool} (All Terms)</b>`;

  let responseMessage = `${header}\n\n`;

  let viewPoints = 0;
  let viewGradedCredits = 0;
  let viewTotalCredits = 0;

  history.forEach((mod, index) => {
    viewTotalCredits += mod.creditValue;
    if (mod.grade.toUpperCase() !== 'P') {
      viewPoints += mod.creditValue * mod.pointValue;
      viewGradedCredits += mod.creditValue;
    }

    const schoolTag = !filterSchool ? `<b>[${mod.school}]</b> ` : "";
    const branchTag = !filterSem ? `<b>[${mod.academicYear} ${mod.semester}]</b> ` : "";
    
    responseMessage += `${index + 1}. ${schoolTag}${branchTag}<code>${mod.moduleCode}</code>\n` +
                       `   <b>${mod.moduleName}</b>\n` +
                       `   └─ ${mod.creditValue} CR ➜ Grade: <b>${mod.grade}</b>\n\n`;
  });

  responseMessage += `<b>━━━━━━━━━━━━━━━━━━</b>\n`;

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

  return responseMessage;
}

/**
 * Handle the /kaypoh command
 */
export async function handleHistoryCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const message = ctx.message;
  if (!message || !("text" in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  const filterSchool = args[0]?.toUpperCase();

  // 1. If user provided a school (e.g. /kaypoh ITE), just show it
  if (filterSchool) {
    const report = await generateKaypohReport(userId, filterSchool, args[1]?.toUpperCase(), args[2]?.toUpperCase());
    await replyWithFlavor(ctx, report, "positive");
    return;
  }

  // 2. No args? Check if user has multiple schools
  const db = getDatabase();
  try {
    const [rows]: any = await db.query(
      "SELECT DISTINCT school FROM module_grades WHERE userId = ?",
      [userId]
    );

    const schools = rows.map((r: any) => r.school);

    if (schools.length === 0) {
      await replyWithFlavor(ctx, "Your repository is empty lor! <code>/commit</code> something first.", "negative");
      return;
    }

    // 3. One school only? Just show it.
    if (schools.length === 1) {
      const report = await generateKaypohReport(userId, schools[0]);
      await replyWithFlavor(ctx, report, "positive");
      return;
    }

    // 4. Multiple schools? Show the picker!
    const buttons = schools.map((s: string) => [Markup.button.callback(`🏛️ Audit ${s}`, `view_kaypoh:${s}`)]);
    
    await ctx.reply(
      "<b>🔍 MULTIPLE DIRECTORIES DETECTED</b>\nWhich branch do you want to kaypoh?", 
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
      }
    );

  } catch (error) {
    console.error("❌ Kaypoh error:", error);
    await replyWithFlavor(ctx, "Merge conflict reading logs lor!", "negative");
  }
}

export function registerKaypohCommand(bot: Telegraf): void {
  bot.command("history", handleHistoryCommand);
  bot.command("list", handleHistoryCommand); 
  bot.command("log", handleHistoryCommand);
  bot.command("kepo", handleHistoryCommand);
  bot.command("kaypoh", handleHistoryCommand);

  // 🔥 Handle the callback from the buttons
  bot.action(/view_kaypoh:(.+)/, async (ctx) => {
    const school = ctx.match[1];
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCbQuery(`Fetching ${school} repository...`);
    const report = await generateKaypohReport(userId, school);
    
    await ctx.reply(report, { parse_mode: 'HTML' });
  });
}