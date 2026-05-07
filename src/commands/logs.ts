import { Context, Telegraf, Markup } from "telegraf";
import { getStudentHistory } from "../database/queries";
import { getDatabase } from "../database/connection";
import { replyWithFlavor } from "../middleware/devLingua";
import { GRADING_SCALES } from "../types"; 

/**
 * Logic to generate the actual text report for a specific school
 * Now with Dynamic GPA Scaling!
 */
async function generateSchoolLog(ctx: Context, userId: number, school: string) {
  const history = await getStudentHistory(userId, school);

  if (!history || history.length === 0) {
    return `<b>📂 LOGS EMPTY:</b> No commits found in branch <code>${school}</code>.`;
  }

  // 🔥 Get the correct scale (ITE/NYP = 4.0, UNI = 5.0)
  const schoolScale = GRADING_SCALES[school] || GRADING_SCALES.DEFAULT;
  const maxGpa = schoolScale.max.toFixed(1);

  let report = `<b>📄 SYSTEM_LOG: ${school}_BUILD_HISTORY</b>\n`;
  report += `<b>Timestamp:</b> <code>${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}</code>\n`;
  report += `<b>━━━━━━━━━━━━━━━━━━━━</b>\n\n`;

  let currentTerm = "";
  let totalPoints = 0;
  let totalCredits = 0;

  history.forEach((mod) => {
    const term = `${mod.academicYear} ${mod.semester}`;
    if (term !== currentTerm) {
      currentTerm = term;
      report += `\n  <b>[ BRANCH: ${currentTerm} ]</b>\n`;
    }

    report += `  ├ <code>${mod.moduleCode}</code>: <b>${mod.grade}</b> (${mod.creditValue} CR)\n`;
    report += `  └ <i>${mod.moduleName}</i>\n`;

    // Calculation logic - only count graded modules
    if (mod.grade !== 'P' && mod.grade !== 'S' && mod.grade !== 'U') {
      totalPoints += mod.creditValue * mod.pointValue;
      totalCredits += mod.creditValue;
    }
  });

  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  
  report += `\n<b>━━━━━━━━━━━━━━━━━━━━</b>\n`;
  report += `📊 <b>${school} BUILD STATS</b>\n`;
  report += `Cumulative GPA: <u><b>${gpa} / ${maxGpa}</b></u>\n\n`;
  report += `<i>Build status: STABLE ✅</i>`;

  return report;
}

export async function handleLogsCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  // 🛡️ THE SENIOR DEV FIX: Safely extract text without strict type crashing!
  // If clicked from dashboard button, messageText is undefined.
  // If typed like "/logs NYP", messageText catches it.
  let requestedSchool = "";
  const messageText = (ctx.message as any)?.text;
  
  if (messageText) {
    requestedSchool = messageText.split(/\s+/).slice(1)[0]?.toUpperCase();
  }

  const db = getDatabase();

  try {
    // 2. Short-circuit if a specific school was requested (e.g. /logs ITE)
    if (requestedSchool) {
      const report = await generateSchoolLog(ctx, userId, requestedSchool);
      await ctx.reply(report, { parse_mode: 'HTML' });
      return;
    }

    // 3. Audit all unique schools in the user's DB
    const [rows]: any = await db.query(
      "SELECT DISTINCT school FROM module_grades WHERE userId = ?",
      [userId]
    );

    const schools = rows.map((r: any) => r.school);

    if (schools.length === 0) {
      await replyWithFlavor(ctx, "Your database is empty lor! Go <code>/commit</code> something first.", "negative");
      return;
    }

    // 4. One school? Show immediately. Multiple? Show buttons.
    if (schools.length === 1) {
      const report = await generateSchoolLog(ctx, userId, schools[0]);
      await ctx.reply(report, { parse_mode: 'HTML' });
    } else {
      const buttons = schools.map((s: string) => [Markup.button.callback(`🏛️ Audit ${s}`, `view_log:${s}`)]);
      await ctx.reply(
        "<b>🗄️ MULTIPLE REPOSITORIES DETECTED</b>\nWhich school's deployment logs do you want to audit?", 
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard(buttons)
        }
      );
    }

  } catch (error) {
    console.error("❌ Logs error:", error);
    await replyWithFlavor(ctx, "Merge conflict reading logs lor!", "negative");
  }
}

export function registerLogsCommand(bot: Telegraf): void {
  bot.command("logs", handleLogsCommand);
  bot.command("transcript", handleLogsCommand);

  // Handle the button click when user selects a specific school
  bot.action(/view_log:(.+)/, async (ctx) => {
    const school = ctx.match[1];
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCbQuery(`Fetching ${school} logs...`);
    const report = await generateSchoolLog(ctx, userId, school);
    
    await ctx.reply(report, { parse_mode: 'HTML' });
  });
}