import { Context, Telegraf } from "telegraf";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /lobang command
 * Displays the updated developer manual v3.0 (Enterprise Build)
 * Version 3.0: Integrated surgical Issue ID logic for Pipeline Monitoring.
 */
export async function handleLobangCommand(ctx: Context): Promise<void> {
  const manual = `
📂 <b>KiasuCode Dev Manual v3.0</b>
<i>Build Status: ENTERPRISE (ID-Surgical Logic Active)</i> 🚀

🔄 <b>BRANCHING (REPOS)</b>
<code>/checkout &lt;SCHOOL&gt; &lt;YEAR&gt; &lt;SEM&gt;</code>
Switch active repository branch.
<i>Example: /checkout NYP Y2 S1</i>

🚀 <b>COMMITTING (PRODUCTION)</b>
<code>/commit &lt;CODE&gt; &lt;CR&gt; &lt;GRADE&gt; &lt;NAME&gt;</code>
Deploy module grade to branch. Recalculates CGPA automatically.

🧪 <b>STAGING (AGAK-AGAK)</b>
<code>/agak_agak &lt;MOD&gt; &lt;NAME&gt; &lt;SCORE&gt; &lt;WEIGHT%&gt;</code>
Forecast exam targets. Alamak! Use <code>/salah</code> to undo.

🔍 <b>KAYPOH &amp; LOGS</b>
<code>/kaypoh</code> | <code>/gpa</code> | <code>/logs</code>
Drill down into history or fetch build status summary.

📋 <b>PIPELINE MONITORING (NEW)</b>
<code>/deadline &lt;TASK&gt; &lt;DATE&gt; [TIME]</code>
Open a new critical issue in the pipeline.

<code>/pipeline</code>
View all active issues. <b>Note the [Issue #ID] for surgical ops!</b>

<code>/drop_issue &lt;ID&gt;</code>
Surgically remove a task by its ID. No more duplicate errors.

<code>/patch_issue &lt;ID&gt; &lt;NEW_DATE&gt;</code>
Hotfix a specific deadline's target date/time.

🛠️ <b>HOTFIXING (MODULES)</b>
<code>/patch &lt;CODE&gt;</code>
Edit production module fields via interactive menu.

🗑️ <b>ROLLBACK</b>
<code>/drop &lt;CODE&gt;</code> | <code>/restore</code>
Soft-delete module to Recycle Bin or undo the last drop.

<b>━━━━━━━━━━━━━━━━━━━━━━</b>
<i>Help:</i> <code>/lobang</code> | <code>/help</code> | <code>/man</code>
  `.trim();

  await replyWithFlavor(ctx, manual, "casual");
}

/**
 * Register lobang command handlers
 */
export function registerLobangCommand(bot: Telegraf): void {
  bot.command("lobang", handleLobangCommand);
  bot.command("help", handleLobangCommand);
  bot.command("man", handleLobangCommand); 
}