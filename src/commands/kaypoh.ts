import { Context, Telegraf, Markup } from "telegraf";
import { getStudentHistory, getStudentProfile } from "../database/queries";
import { getDatabase } from "../database/connection";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Logic to generate the history report string
 */
async function generateKaypohReport(userId: number, filterSchool?: string, filterYear?: string, filterSem?: string) {
  // Convert "ALL" back to undefined for the DB query
  const school = filterSchool === "ALL" ? undefined : filterSchool;
  const year = filterYear === "ALL" ? undefined : filterYear;
  const sem = filterSem === "ALL" ? undefined : filterSem;

  const history = await getStudentHistory(userId, school, year, sem);
  const profile = await getStudentProfile(userId);

  if (!history || history.length === 0) {
    const path = [school, year, sem].filter(Boolean).join(" ➜ ");
    return `<b>⚠️ EMPTY DIRECTORY</b>\nNo commits found in branch: <code>${path || "Global"}</code>!`;
  }

  let header = "📜 <b>Global Repository Overview</b>";
  if (school && year && sem) header = `📂 <b>Repo: ${school} ➜ ${year} ➜ ${sem}</b>`;
  else if (school && year) header = `📂 <b>Repo: ${school} ➜ ${year}</b>`;
  else if (school) header = `📂 <b>Repo: ${school} (All Terms)</b>`;

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

    const schoolTag = !school ? `<b>[${mod.school}]</b> ` : "";
    const branchTag = !sem ? `<b>[${mod.academicYear} ${mod.semester}]</b> ` : "";
    
    responseMessage += `${index + 1}. ${schoolTag}${branchTag}<code>${mod.moduleCode}</code>\n` +
                       `   <b>${mod.moduleName}</b>\n` +
                       `   └─ ${mod.creditValue} CR ➜ Grade: <b>${mod.grade}</b>\n\n`;
  });

  responseMessage += `<b>━━━━━━━━━━━━━━━━━━</b>\n`;

  if (school || year || sem) {
    const viewGpa = viewGradedCredits > 0 ? (viewPoints / viewGradedCredits).toFixed(2) : "0.00";
    let gpaLabel = "Branch GPA";
    if (sem) gpaLabel = "Semester GPA";
    else if (year) gpaLabel = "Year GPA";

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

// ==========================================
// 🛠️ UI GENERATORS FOR THE DRILL-DOWN MENU
// ==========================================

async function showYearMenu(ctx: Context, userId: number, school: string) {
  const db = getDatabase();
  const [rows]: any = await db.query(
    "SELECT DISTINCT academicYear FROM module_grades WHERE userId = ? AND school = ? ORDER BY academicYear ASC",
    [userId, school]
  );
  
  const years = rows.map((r: any) => r.academicYear);
  const buttons = [];

  // Always give them an option to view everything for this school
  buttons.push([Markup.button.callback(`📜 View ALL ${school}`, `kyp_res:${school}:ALL:ALL`)]);

  // Add a button for each Year found in the DB
  years.forEach((y: string) => {
    buttons.push([Markup.button.callback(`📅 ${y}`, `kyp_yr:${school}:${y}`)]);
  });

  const msg = `<b>📂 Repository: ${school}</b>\nSelect an Academic Year to drill down, or view all records:`;
  
  if (ctx.callbackQuery) {
    await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  } else {
    await ctx.reply(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  }
}

async function showSemMenu(ctx: Context, userId: number, school: string, year: string) {
  const db = getDatabase();
  const [rows]: any = await db.query(
    "SELECT DISTINCT semester FROM module_grades WHERE userId = ? AND school = ? AND academicYear = ? ORDER BY semester ASC",
    [userId, school, year]
  );
  
  const sems = rows.map((r: any) => r.semester);
  const buttons = [];

  // Option to view everything for this specific year
  buttons.push([Markup.button.callback(`📜 View ALL ${year}`, `kyp_res:${school}:${year}:ALL`)]);

  // Add a button for each Semester found
  sems.forEach((sem: string) => {
    buttons.push([Markup.button.callback(`📚 ${sem}`, `kyp_res:${school}:${year}:${sem}`)]);
  });

  // Back button to go up a level
  buttons.push([Markup.button.callback(`🔙 Back to Years`, `kyp_sch:${school}`)]);

  const msg = `<b>📂 Branch: ${school} ➜ ${year}</b>\nSelect a Semester to view:`;
  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
}

// ==========================================
// 🚀 MAIN COMMAND HANDLER
// ==========================================

export async function handleHistoryCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  // 🛡️ Safe Extraction (Bypass for Dashboard button)
  let args: string[] = [];
  const messageText = (ctx.message as any)?.text || (ctx as any).message?.text;
  if (messageText) {
    args = messageText.split(/\s+/).slice(1);
  }

  // If power-user types "/kaypoh ITE Y1 S1", bypass the menu entirely!
  if (args.length > 0) {
    const report = await generateKaypohReport(userId, args[0]?.toUpperCase(), args[1]?.toUpperCase(), args[2]?.toUpperCase());
    await replyWithFlavor(ctx, report, "positive");
    return;
  }

  // Otherwise, start the GUI Flow
  const db = getDatabase();
  try {
    const [rows]: any = await db.query("SELECT DISTINCT school FROM module_grades WHERE userId = ?", [userId]);
    const schools = rows.map((r: any) => r.school);

    if (schools.length === 0) {
      await replyWithFlavor(ctx, "Your repository is empty lor! <code>/commit</code> something first.", "negative");
      return;
    }

    // If they only have 1 school (e.g. only NYP), skip the School picker and go straight to Year picker!
    if (schools.length === 1) {
      await showYearMenu(ctx, userId, schools[0]);
      return;
    }

    // If multiple schools, show School picker
    const buttons = schools.map((s: string) => [Markup.button.callback(`🏛️ Audit ${s}`, `kyp_sch:${s}`)]);
    await ctx.reply("<b>🔍 MULTIPLE DIRECTORIES DETECTED</b>\nWhich branch do you want to kaypoh?", { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });

  } catch (error) {
    console.error("❌ Kaypoh error:", error);
    await replyWithFlavor(ctx, "Merge conflict reading logs lor!", "negative");
  }
}

// ==========================================
// 📡 REGISTRY & ACTION LISTENERS
// ==========================================

export function registerKaypohCommand(bot: Telegraf): void {
  bot.command("history", handleHistoryCommand);
  bot.command("list", handleHistoryCommand); 
  bot.command("log", handleHistoryCommand);
  bot.command("kepo", handleHistoryCommand);
  bot.command("kaypoh", handleHistoryCommand);

  // 🖱️ Action: User clicked a School -> Show Years
  bot.action(/^kyp_sch:([^:]+)$/, async (ctx) => {
    const school = ctx.match[1];
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.answerCbQuery();
    await showYearMenu(ctx, userId, school);
  });

  // 🖱️ Action: User clicked a Year -> Show Semesters
  bot.action(/^kyp_yr:([^:]+):([^:]+)$/, async (ctx) => {
    const school = ctx.match[1];
    const year = ctx.match[2];
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.answerCbQuery();
    await showSemMenu(ctx, userId, school, year);
  });

  // 🖱️ Action: User requested the Final Report!
  bot.action(/^kyp_res:([^:]+):([^:]+):([^:]+)$/, async (ctx) => {
    const school = ctx.match[1];
    const year = ctx.match[2];
    const sem = ctx.match[3];
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCbQuery(`Fetching records...`);
    const report = await generateKaypohReport(userId, school, year, sem);
    
    // Morph the menu into the final report
    await ctx.editMessageText(report, { parse_mode: 'HTML' });
  });
}