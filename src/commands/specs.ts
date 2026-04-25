import { Context, Telegraf } from "telegraf";
import { GRADING_SCALES, SCHOOL_RESOLVER } from "../types";

/**
 * Handle the /specs command
 * Displays the full system manifest and all grading permutations
 */
export async function handleSpecsCommand(ctx: Context): Promise<void> {
  let doc = `<b>📄 SYSTEM_MANIFEST: KIASUCODE_CORE_v1.0</b>\n`;
  doc += `<i>Environment: Production | Maintainer: ${ctx.from?.first_name || "Dev"}</i>\n`;
  doc += `<b>━━━━━━━━━━━━━━━━━━━━</b>\n\n`;

  // 1. Command Manual
  doc += `<b>🛠️ OPERATIONAL_COMMANDS:</b>\n`;
  doc += `• <code>/checkout &lt;SCH&gt; &lt;YR&gt; &lt;SEM&gt;</code>\n  <i>➜ Initialize active environment</i>\n`;
  doc += `• <code>/commit &lt;CODE&gt; &lt;CR&gt; &lt;GR&gt; &lt;NAME&gt;</code>\n  <i>➜ Deploy grade to active branch</i>\n`;
  doc += `• <code>/logs [SCH]</code>\n  <i>➜ Audit full build history</i>\n`;
  doc += `• <code>/patch &lt;CODE&gt;</code>\n  <i>➜ Hotfix a module entry</i>\n\n`;

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

  doc += `<i>// Note: Run /specs if you blur. Don't simply commit!</i>`;

  await ctx.reply(doc, { parse_mode: 'HTML' });
}

export function registerSpecsCommand(bot: Telegraf): void {
  bot.command("specs", handleSpecsCommand);
  bot.command("man", handleSpecsCommand);
  bot.command("readme", handleSpecsCommand);
  bot.command("dontblur", handleSpecsCommand);
}