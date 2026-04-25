import { Context, Telegraf } from "telegraf";
import { getDatabase } from "../database/connection";
import { calculateSchoolGPA } from "../database/queries";
import { replyWithFlavor } from "../middleware/devLingua";

export async function handleGpaCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const db = getDatabase();
    
    // 1. Find out which "Folder" (School) the user is currently in
    const [studentRows]: any = await db.query(
      "SELECT activeSchool, activeYear, activeSem FROM students WHERE userId = ?",
      [userId]
    );

    const student = studentRows[0];
    if (!student || !student.activeSchool) {
      await replyWithFlavor(ctx, "You haven't set an active school yet! Run `/checkout NYP Y1 S1` first lor.", "negative");
      return;
    }

    const currentSchool = student.activeSchool;

    // 2. Calculate the isolated GPA for THIS school only
    const stats = await calculateSchoolGPA(userId, currentSchool);

    if (stats.count === 0) {
      await replyWithFlavor(ctx, `Your repository for *${currentSchool}* is empty! Go \`/commit\` some grades.`, "negative");
      return;
    }

    // 3. Print the isolated dashboard
    const message = `
📊 *Academic Build Status*

🏢 **Institution:** ${currentSchool}
📅 **Active Branch:** ${student.activeYear} ${student.activeSem}
━━━━━━━━━━━━━━━━━━
📚 Modules Committed: ${stats.count}
🎯 Total Credits: ${stats.credits}
🏆 **Current ${currentSchool} CGPA: *${stats.gpa.toFixed(2)}***

Repo status: ISOLATED & STABLE ✅
    `.trim();

    await replyWithFlavor(ctx, message, "positive");
  } catch (error) {
    console.error("❌ GPA calculation error:", error);
    await replyWithFlavor(ctx, "Merge conflict calculating your isolated GPA lor!", "negative");
  }
}

export function registerGpaCommand(bot: Telegraf): void {
  bot.command("gpa", handleGpaCommand);
}