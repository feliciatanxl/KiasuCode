import { Context } from "telegraf";
import { CommandContext, GRADE_POINTS } from "../types";
import { replyWithFlavor } from "../middleware/devLingua";
import { 
  ensureStudentProfile, 
  moduleExists, 
  insertModuleGrade, 
  updateStudentGPA 
} from "../database/queries";

function parseCommitArgs(args: string[]) {
  if (args.length < 3) return null;

  const moduleCode = args[0].toUpperCase();
  const creditValue = parseInt(args[1], 10);
  const grade = args[2].toUpperCase();

  if (!/^[A-Z]{2,3}\d{3,4}$/.test(moduleCode)) return null;
  if (isNaN(creditValue) || creditValue < 1 || creditValue > 4) return null;
  if (!(grade in GRADE_POINTS)) return null;

  return { moduleCode, creditValue, grade };
}

export async function handleCommitCommand(
  ctx: Context,
  commandCtx: CommandContext
): Promise<void> {
  try {
    const parsed = parseCommitArgs(commandCtx.args);

    if (!parsed) {
      await replyWithFlavor(ctx, "Invalid format lor! Use: /commit IT101 4 A", "negative");
      return;
    }

    const { moduleCode, creditValue, grade } = parsed;
    const pointValue = GRADE_POINTS[grade];

    // 1. Ensure user exists
    await ensureStudentProfile(commandCtx.userId, commandCtx.username);

    // 2. Check for duplicates
    const exists = await moduleExists(commandCtx.userId, moduleCode);
    if (exists) {
      await replyWithFlavor(ctx, `You already committed ${moduleCode} lah! Cannot duplicate.`, "negative");
      return;
    }

    // 3. Insert into DB
    const result = await insertModuleGrade(
      commandCtx.userId,
      moduleCode,
      creditValue,
      grade,
      pointValue
    );

    if (!result.success) {
      throw new Error(result.message);
    }

    // 4. Recalculate GPA
    await updateStudentGPA(commandCtx.userId);

    const responseMessage = `✅ Module committed successfully!\nModule: ${moduleCode}\nCredits: ${creditValue}\nGrade: ${grade} (${pointValue} points)`;
    await replyWithFlavor(ctx, responseMessage, "positive");

  } catch (error) {
    console.error("❌ Commit command error:", error);
    await replyWithFlavor(ctx, "Error committing module lor!", "negative");
  }
}

export function registerCommitCommand(bot: any): void {
  bot.command("commit", async (ctx: Context) => {
    const from = ctx.message?.from;
    const message = ctx.message;

    // Type guard for message text
    if (!message || !("text" in message) || !from) {
      await ctx.reply("Cannot identify user or text - merge conflict lor!");
      return;
    }

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