import { Context } from "telegraf";
import { CommandContext, GRADE_POINTS } from "../types";
import { replyWithFlavor } from "../middleware/devLingua";
import { getDatabase } from "../database/connection"; // Added to fetch context
import { 
  ensureStudentProfile, 
  moduleExists, 
  insertModuleGrade, 
  updateStudentGPA 
} from "../database/queries";

/**
 * Enhanced Parser: Now captures Module Name!
 * Format: /commit <CODE> <CREDITS> <GRADE> <FULL NAME>
 * Example: /commit IT1111 2 B Applied Math in Computing
 */
function parseCommitArgs(args: string[]) {
  if (args.length < 3) return null;

  const moduleCode = args[0].toUpperCase();
  const creditValue = parseInt(args[1], 10);
  const grade = args[2].toUpperCase();
  
  // Grab everything after the 3rd argument as the name
  const moduleName = args.length > 3 ? args.slice(3).join(" ") : "Unnamed Module";

  if (!/^[A-Z]{2,3}\d{3,4}$/.test(moduleCode)) return null;
  if (isNaN(creditValue) || creditValue < 1 || creditValue > 6) return null; // Increased max to 6 for flexibility
  if (!(grade in GRADE_POINTS)) return null;

  return { moduleCode, creditValue, grade, moduleName };
}

export async function handleCommitCommand(
  ctx: Context,
  commandCtx: CommandContext
): Promise<void> {
  const db = getDatabase();

  try {
    // 1. Fetch Active Branch Context first
    const [studentRows]: any = await db.query(
      "SELECT activeSchool, activeYear, activeSem FROM students WHERE userId = ?",
      [commandCtx.userId]
    );

    const activeContext = studentRows[0];

    // Guardrail: Force user to /checkout if they haven't set a school yet
    if (!activeContext || !activeContext.activeSchool) {
      await replyWithFlavor(
        ctx, 
        "Wah lau, you haven't told me which school you are in! \nRun `/checkout <SCHOOL> <YEAR> <SEM>` first lor.", 
        "negative"
      );
      return;
    }

    const parsed = parseCommitArgs(commandCtx.args);

    if (!parsed) {
      await replyWithFlavor(ctx, "Invalid format! Use: `/commit IT101 4 A Module Name`", "negative");
      return;
    }

    const { moduleCode, creditValue, grade, moduleName } = parsed;
    const pointValue = GRADE_POINTS[grade];

    // 2. Ensure user exists in our logs
    await ensureStudentProfile(commandCtx.userId, commandCtx.username);

    // 3. Check for duplicates in THIS specific branch
    // (We pass school/sem info to avoid cross-school conflicts)
    const exists = await moduleExists(
        commandCtx.userId, 
        moduleCode, 
        activeContext.activeSchool, 
        activeContext.activeYear, 
        activeContext.activeSem
    );
    
    if (exists) {
      await replyWithFlavor(ctx, `You already committed ${moduleCode} in ${activeContext.activeSchool} ${activeContext.activeSem} lah!`, "negative");
      return;
    }

    // 4. Insert into DB with full enrichment
    // Note: Make sure you update your insertModuleGrade in queries.ts to accept these extra fields!
    const result = await insertModuleGrade(
      commandCtx.userId,
      moduleCode,
      moduleName, // New field
      creditValue,
      grade,
      pointValue,
      activeContext.activeSchool,
      activeContext.activeYear,
      activeContext.activeSem
    );

    if (!result.success) {
      throw new Error(`${result.message} | Details: ${result.error}`);
    }

    // 5. Recalculate GPA for the active school repository
    await updateStudentGPA(commandCtx.userId);

    const responseMessage = `✅ **Module Deployed to ${activeContext.activeSchool}!**\n\n` +
                             `Code: \`${moduleCode}\`\n` +
                             `Name: *${moduleName}*\n` +
                             `Credits: ${creditValue} CR\n` +
                             `Grade: ${grade} (${pointValue} points)`;
                             
    await replyWithFlavor(ctx, responseMessage, "positive");

  } catch (error) {
    console.error("❌ Commit command error:", error);
    await replyWithFlavor(ctx, "Merge conflict during commit! Check your database connection lor.", "negative");
  }
}

export function registerCommitCommand(bot: any): void {
  bot.command("commit", async (ctx: Context) => {
    const from = ctx.message?.from;
    const message = ctx.message;

    if (!message || !("text" in message) || !from) return;

    const text = message.text;
    const args = text.replace(/^\/commit\s+/, "").split(/\s+/);

    const commandCtx: CommandContext = {
      userId: from.id,
      username: from.username || `User${from.id}`,
      args,
      rawText: text,
    };

    await handleCommitCommand(ctx, commandCtx);
  });
}