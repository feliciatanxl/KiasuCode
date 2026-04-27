import { Context, Telegraf } from "telegraf";
import { getDatabase } from "../database/connection";
import { calculateSchoolGPA } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

export async function handleGpaCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const db = getDatabase();
    
    // 1. Fetch the user's current environment context
    const [studentRows]: any = await db.query(
      "SELECT activeSchool, activeYear, activeSemester FROM students WHERE userId = ?",
      [userId]
    );

    const student = studentRows[0];
    if (!student || !student.activeSchool) {
      await replyWithFlavor(
        ctx, 
        "<b>⚠️ ENVIRONMENT NOT SET</b>\n\n" +
        "You haven't initialized an active school branch! \n" +
        "Run <code>/checkout &lt;SCHOOL&gt; &lt;YEAR&gt; &lt;SEM&gt;</code> first lor.", 
        "negative"
      );
      return;
    }

    const currentSchool = student.activeSchool;

    // 2. Calculate GPA isolated to the current school "Repository"
    const stats = await calculateSchoolGPA(userId, currentSchool);

    if (stats.count === 0) {
      await replyWithFlavor(
        ctx, 
        `<b>📂 EMPTY REPOSITORY</b>\n\n` +
        `Your repository for <b>${currentSchool}</b> is empty! \n` +
        `Go <code>/commit</code> some grades to see your build status.`, 
        "negative"
      );
      return;
    }

    // 3. Build the Modern HTML Dashboard
    const responseMessage = 
      `<b>📊 ACADEMIC BUILD STATUS</b>\n\n` +
      `<b>Institution:</b> <code>${currentSchool}</code>\n` +
      `<b>Active Branch:</b> <code>${student.activeYear} ${student.activeSem}</code>\n` +
      `<b>━━━━━━━━━━━━━━━━━━</b>\n` +
      `📦 <b>Modules:</b> <code>${stats.count}</code>\n` +
      `📜 <b>Total Credits:</b> <code>${stats.credits} CR</code>\n` +
      `🏆 <b>Current CGPA:</b> <u><b>${stats.gpa.toFixed(2)}</b></u>\n\n` +
      `<i>Status: ISOLATED &amp; STABLE ✅</i>`;

    await replyWithFlavor(ctx, responseMessage, "positive");

  } catch (error) {
    console.error("❌ GPA calculation error:", error);
    await replyWithFlavor(
      ctx, 
      "<b>⚠️ BUILD ERROR</b>\nMerge conflict while calculating your isolated GPA lor!", 
      "negative"
    );
  }
}

export function registerGpaCommand(bot: Telegraf): void {
  bot.command("gpa", handleGpaCommand);
}