import { Context } from "telegraf";
import { CommandContext, GRADING_SCALES } from "../types";
import { replyWithFlavor } from "../middleware/devLingua";
import { getDatabase } from "../database/connection";
import { 
  ensureStudentProfile, 
  moduleExists, 
  insertModuleGrade, 
  updateStudentGPA 
} from "../database/queries";

/**
 * Enhanced Parser: Now supports ITE, Poly, and Uni codes!
 */
function parseCommitArgs(args: string[], schoolScale: any) {
  if (args.length < 3) return null;

  const moduleCode = args[0].toUpperCase();
  const creditValue = parseInt(args[1], 10);
  const grade = args[2].toUpperCase();
  const moduleName = args.length > 3 ? args.slice(3).join(" ") : "Unnamed Module";

  // 🔥 THE FIX: Regex updated to allow alphanumeric codes (4-10 chars)
  // This supports NYP (IT1111) and ITE (AI33001FP)
  if (!/^[A-Z0-9]{4,10}$/.test(moduleCode)) return null;

  // 🔥 Increased credit limit to 10 for ITE/Uni flexibility
  if (isNaN(creditValue) || creditValue < 1 || creditValue > 10) return null;
  
  if (!(grade in schoolScale.points)) return null;

  return { moduleCode, creditValue, grade, moduleName };
}

export async function handleCommitCommand(
  ctx: Context,
  commandCtx: CommandContext
): Promise<void> {
  const db = getDatabase();

  try {
    const [studentRows]: any = await db.query(
      "SELECT activeSchool, activeYear, activeSem FROM students WHERE userId = ?",
      [commandCtx.userId]
    );

    const activeContext = studentRows[0];

    if (!activeContext || !activeContext.activeSchool) {
      await replyWithFlavor(
        ctx, 
        "<b>⚠️ NO ACTIVE BRANCH</b>\n\n" +
        "Wah lau, you haven't told me which school you are in! \n" +
        "Run <code>/checkout &lt;SCHOOL&gt; &lt;YEAR&gt; &lt;SEM&gt;</code> first lor.", 
        "negative"
      );
      return;
    }

    const activeSchool = activeContext.activeSchool;
    const schoolScale = GRADING_SCALES[activeSchool] || GRADING_SCALES.DEFAULT;

    const parsed = parseCommitArgs(commandCtx.args, schoolScale);

    if (!parsed) {
      await replyWithFlavor(
        ctx, 
        "<b>⚠️ INVALID COMMIT FORMAT</b>\n\n" +
        "Usage: <code>/commit &lt;CODE&gt; &lt;CR&gt; &lt;GRADE&gt; &lt;NAME&gt;</code>\n" +
        "Example: <code>/commit AI33001FP 4 DIST Coding for AI</code>", 
        "negative"
      );
      return;
    }

    const { moduleCode, creditValue, grade, moduleName } = parsed;
    const pointValue = schoolScale.points[grade];

    await ensureStudentProfile(commandCtx.userId, commandCtx.username);

    const exists = await moduleExists(
        commandCtx.userId, 
        moduleCode, 
        activeContext.activeSchool, 
        activeContext.activeYear, 
        activeContext.activeSem
    );
    
    if (exists) {
      await replyWithFlavor(
        ctx, 
        `<b>❌ MERGE CONFLICT</b>\n\n` +
        `You already committed <code>${moduleCode}</code> to <b>${activeContext.activeSchool}</b> branch lah!`, 
        "negative"
      );
      return;
    }

    const result = await insertModuleGrade(
      commandCtx.userId,
      moduleCode,
      moduleName,
      creditValue,
      grade,
      pointValue,
      activeContext.activeSchool,
      activeContext.activeYear,
      activeContext.activeSem
    );

    if (!result.success) throw new Error(result.message);

    await updateStudentGPA(commandCtx.userId);

    const maxGpa = schoolScale.max.toFixed(1);

    const responseMessage = 
        `<b>🚀 DEPLOYMENT SUCCESSFUL</b>\n\n` +
        `<b>Branch:</b> <code>${activeContext.activeSchool} ➜ ${activeContext.activeSem}</code>\n` +
        `<b>Module:</b> <code>${moduleCode}</code>\n` +
        `<b>Title:</b> <i>${moduleName}</i>\n` +
        `<b>Result:</b> <b>${grade}</b> (<code>${pointValue.toFixed(1)} / ${maxGpa}</code>)`;
                               
    await replyWithFlavor(ctx, responseMessage, "positive");

  } catch (error) {
    console.error("❌ Commit error:", error);
    await replyWithFlavor(
        ctx, 
        "<b>⚠️ BUILD FAILED</b>\nMerge conflict during commit! Check your DB connection lor.", 
        "negative"
      );
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