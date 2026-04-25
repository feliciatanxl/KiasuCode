import { Context } from "telegraf";
import { CommandContext, GRADE_POINTS } from "../types";
import { replyWithFlavor } from "../middleware/devLingua";
import { getDatabase } from "../database/connection";
import { 
  ensureStudentProfile, 
  moduleExists, 
  insertModuleGrade, 
  updateStudentGPA 
} from "../database/queries";

/**
 * Enhanced Parser: Now captures Module Name!
 * Format: /commit <CODE> <CREDITS> <GRADE> <FULL NAME>
 */
function parseCommitArgs(args: string[]) {
  if (args.length < 3) return null;

  const moduleCode = args[0].toUpperCase();
  const creditValue = parseInt(args[1], 10);
  const grade = args[2].toUpperCase();
  const moduleName = args.length > 3 ? args.slice(3).join(" ") : "Unnamed Module";

  if (!/^[A-Z]{2,3}\d{3,4}$/.test(moduleCode)) return null;
  if (isNaN(creditValue) || creditValue < 1 || creditValue > 6) return null;
  if (!(grade in GRADE_POINTS)) return null;

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

    // Guardrail: HTML styled warning
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

    const parsed = parseCommitArgs(commandCtx.args);

    if (!parsed) {
      await replyWithFlavor(
        ctx, 
        "<b>⚠️ INVALID COMMIT FORMAT</b>\n\n" +
        "Usage: <code>/commit &lt;CODE&gt; &lt;CR&gt; &lt;GRADE&gt; &lt;NAME&gt;</code>\n" +
        "Example: <code>/commit IT1111 4 A Applied Math</code>", 
        "negative"
      );
      return;
    }

    const { moduleCode, creditValue, grade, moduleName } = parsed;
    const pointValue = GRADE_POINTS[grade];

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

    // 🔥 The "Shiok" Success UI
    const responseMessage = 
        `<b>🚀 DEPLOYMENT SUCCESSFUL</b>\n\n` +
        `<b>Branch:</b> <code>${activeContext.activeSchool} ➜ ${activeContext.activeSem}</code>\n` +
        `<b>Module:</b> <code>${moduleCode}</code>\n` +
        `<b>Title:</b> <i>${moduleName}</i>\n` +
        `<b>Result:</b> <b>${grade}</b> (<code>${creditValue} CR</code>)`;
                               
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