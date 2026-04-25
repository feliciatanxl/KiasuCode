/**
 * Commit Command (/commit)
 * Add a module grade to student's transcript
 * Usage: /commit IT101 4 A
 *   - Module code: IT101
 *   - Credit value: 4
 *   - Grade: A
 *
 * Chiong this command lor - add grades to the system!
 * LGTM pattern with error handling steady lah
 */

import { Context } from "telegraf";
import { CommandContext, GRADE_POINTS } from "../types";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Parse command arguments from user input
 * Extract module code, credits, and grade from /commit IT101 4 A
 * @param args - Raw command arguments
 * @returns Parsed module info or null if invalid
 */
function parseCommitArgs(
  args: string[]
): {
  moduleCode: string;
  creditValue: number;
  grade: string;
} | null {
  if (args.length < 3) {
    return null;
  }

  const moduleCode = args[0].toUpperCase();
  const creditValue = parseInt(args[1], 10);
  const grade = args[2].toUpperCase();

  // Validate module code format (basic check)
  if (!/^[A-Z]{2,3}\d{3,4}$/.test(moduleCode)) {
    return null;
  }

  // Validate credit value (typically 1-4 credits)
  if (isNaN(creditValue) || creditValue < 1 || creditValue > 4) {
    return null;
  }

  // Validate grade exists in our grading scale
  if (!(grade in GRADE_POINTS)) {
    return null;
  }

  return { moduleCode, creditValue, grade };
}

/**
 * Execute the /commit command
 * This is where the SQLite insert will happen - placeholder for now!
 * Production function - handles all the business logic
 *
 * @param ctx - Telegraf context object
 * @param commandCtx - Extracted command context (userId, args, etc.)
 * @returns Promise<void>
 *
 * Flow:
 * 1. Parse user input ✅
 * 2. Validate inputs ✅
 * 3. Call database insert function (TODO: write insertModuleGrade function)
 * 4. Update student GPA calculation (TODO: write updateStudentGPA function)
 * 5. Respond with Dev-Lingua flavor (middleware handles this!)
 */
export async function handleCommitCommand(
  ctx: Context,
  commandCtx: CommandContext
): Promise<void> {
  try {
    // Step 1: Parse the command arguments
    // Format: /commit MODULE_CODE CREDITS GRADE
    const parsed = parseCommitArgs(commandCtx.args);

    // Step 2: Validate parsing result
    if (!parsed) {
      await replyWithFlavor(
        ctx,
        `Invalid format lor! Use: /commit IT101 4 A\n\nExample:\n/commit CS101 4 A (4-credit module, grade A)`,
        "negative"
      );
      return;
    }

    const { moduleCode, creditValue, grade } = parsed;
    const pointValue = GRADE_POINTS[grade];

    // Step 3: Build the database insert query
    // TODO: Implement insertModuleGrade() function in database/queries.ts
    // This function should:
    // - INSERT INTO modules_grades (userId, moduleCode, creditValue, grade, pointValue, committedAt)
    // - VALUES (userId, moduleCode, creditValue, grade, pointValue, NOW())
    // - Return the inserted record ID
    //
    // const result = await insertModuleGrade(
    //   commandCtx.userId,
    //   moduleCode,
    //   creditValue,
    //   grade,
    //   pointValue
    // );

    // Placeholder response (will replace with actual DB insert)
    const responseMessage = `
✅ Module committed successfully!
Module: ${moduleCode}
Credits: ${creditValue}
Grade: ${grade} (${pointValue} points)
User ID: ${commandCtx.userId}

TODO: This will trigger MySQL INSERT query
TODO: Then recalculate student's overall GPA
    `.trim();

    // Step 4: Send response with Dev-Lingua flavor (automatic via middleware!)
    await replyWithFlavor(ctx, responseMessage, "positive");

    // Step 5: TODO - Update student's overall GPA after insert
    // This should:
    // - Calculate weighted average: (total credit * point value) / total credits
    // - UPDATE students SET totalGPA = newGPA, moduleCount = newCount
    // - Log this action for audit purposes
    //
    // await updateStudentGPA(commandCtx.userId);

    console.log(
      `✅ Commit recorded for user ${commandCtx.userId}: ${moduleCode}`
    );
  } catch (error) {
    console.error("❌ Commit command error:", error);

    // Send error response with negative Dev-Lingua flavor
    await replyWithFlavor(
      ctx,
      `Error committing module lor! Please try again. Debug: ${error instanceof Error ? error.message : "Unknown error"}`,
      "negative"
    );
  }
}

/**
 * Register the /commit command handler
 * Call this from index.ts during bot setup - LGTM, production pattern
 *
 * @param bot - Telegraf bot instance
 */
export function registerCommitCommand(bot: any): void {
  bot.command("commit", async (ctx: Context) => {
    // Extract user info and arguments
    const from = ctx.message?.from;
    const text = ctx.message?.text || "";

    if (!from) {
      await ctx.reply("Cannot identify user - merge conflict lor!");
      return;
    }

    // Parse arguments from command (remove /commit prefix)
    const args = text.replace(/^\/commit\s+/, "").split(/\s+/);

    const commandCtx: CommandContext = {
      userId: from.id,
      username: from.username || `User${from.id}`,
      args,
      rawText: text,
    };

    // Execute the command
    await handleCommitCommand(ctx, commandCtx);
  });
}

export default { handleCommitCommand, registerCommitCommand };
