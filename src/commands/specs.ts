import { Context, Telegraf } from "telegraf";
import { GRADING_SCALES, SCHOOL_RESOLVER } from "../types";

/**
 * Handle the /specs command
 * Displays the full system manifest and all grading permutations
 */
export async function handleSpecsCommand(ctx: Context): Promise<void> {
  let doc = `<b>📄 SYSTEM_MANIFEST: KIASUCODE_CORE_v3.0</b>\n`;
  doc += `<i>Environment: Production | Maintainer: ${ctx.from?.first_name || "Dev"}</i>\n`;
  doc += `<b>━━━━━━━━━━━━━━━━━━━━</b>\n\n`;

  // 1. Command Manual (Updated for v3.0 Hub & Spoke)
  doc += `<b>🛠️ OPERATIONAL_HUBS:</b>\n`;
  doc += `• <code>/dashboard</code>\n  <i>➜ Read-only telemetry (GPA, Logs, Pipeline)</i>\n`;
  doc += `• <code>/manage</code>\n  <i>➜ Deploy commits, hotfixes, & branch checkouts</i>\n`;
  doc += `• <code>/staging</code>\n  <i>➜ Sandbox for Agak-Agak & Copium forecasting</i>\n`;
  doc += `• <code>/undo</code>\n  <i>➜ Global Ctrl+Z for recent state changes</i>\n`;
  doc += `• <code>/lobang</code>\n  <i>➜ Fetch user manual & navigation guide</i>\n\n`;

  // 2. Full Grading Architecture
  doc += `<b>📊 FULL_GRADING_ARCHITECTURE:</b>\n`;
  
  Object.keys(GRADING_SCALES).forEach(key => {
    if (key === 'DEFAULT') return;
    const scale = GRADING_SCALES[key];
    
    // 🔥 We join ALL grades now, no more slicing!
    const allGrades = Object.keys(scale.points).join(", ");
    
    doc += `<b>[ ${key}_SCALE ]</b> (Max: ${scale.max.toFixed(1)})\n`;
    doc += `Supported: <code>${allGrades}</code>\n\n`;
  });

  // 3. Logic Notes for non-GPA grades
  doc += `<b>💡 BUILD_LOGIC_NOTES:</b>\n`;
  doc += `• <b>Pass/Fail:</b> Grades <code>P</code>, <code>S</code>, and <code>U</code> are committed with 0.0 points and are <u>excluded</u> from GPA denominators.\n`;
  doc += `• <b>NP Cluster:</b> <code>AD+</code> is aliased to 4.0 points.\n\n`;

  // 4. Cluster Mapping
  doc += `<b>🏛️ REGISTERED_CLUSTERS:</b>\n`;
  doc += `<code>${Object.keys(SCHOOL_RESOLVER).join(", ")}</code>\n\n`;

  doc += `<i>// Note: Use the interactive hubs to operate the bot!</i>`;

  await ctx.reply(doc, { parse_mode: 'HTML' });
}

export function registerSpecsCommand(bot: Telegraf): void {
  bot.command("specs", handleSpecsCommand);
  bot.command("readme", handleSpecsCommand);
  bot.command("dontblur", handleSpecsCommand);
}