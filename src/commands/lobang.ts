import { Context, Telegraf } from "telegraf";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /lobang command
 * Displays the updated developer manual v2.3 (Pipeline Update)
 */
export async function handleLobangCommand(ctx: Context): Promise<void> {
  const manual = `
📂 <b>KiasuCode Dev Manual v2.3</b>
<i>Build Status: STABLE (Pipeline Reporting Ready)</i> ✅

🔄 <b>BRANCHING</b>
<code>/checkout &lt;SCHOOL&gt; &lt;YEAR&gt; &lt;SEM&gt;</code>
Switch your active repository branch.

🚀 <b>COMMITTING (PRODUCTION)</b>
<code>/commit &lt;CODE&gt; &lt;CR&gt; &lt;GRADE&gt; &lt;NAME&gt;</code>
Deploy a real module grade to your active branch.

🧪 <b>STAGING (SIMULATION)</b>
<code>/agak_agak &lt;MOD&gt; &lt;NAME&gt; &lt;SCORE&gt; &lt;WEIGHT%&gt; [TARGET%]</code>
Push a component to staging.
<i>Example: /agak_agak IT1234 Quiz 18/20 20</i>

<code>/spill &lt;MOD&gt; [TARGET]</code>
<b>PIPELINE REPORT:</b> Pull up the receipts and maintenance targets. ☕
<i>Aliases: /logs, /kaypoh</i>

<code>/salah &lt;MOD&gt;</code>
Alamak! Undo the last component entry in staging.

<code>/flush &lt;MOD&gt; or --all</code>
Purge staging cache. ⚠️ <i>Requires confirmation.</i>

🎯 <b>CHIONG (STRESS TEST)</b>
<code>/chiong &lt;MOD&gt; [TARGET]</code>
Stress test your target. See how much you can slack! 📈

🔍 <b>REPORTS</b>
<code>/gpa</code>
Check current Production CGPA.

<code>/view [SCHOOL] [YEAR] [SEM]</code>
Drill down into your historical repo branches.

🛠️ <b>MAINTENANCE</b>
<code>/patch &lt;CODE&gt;</code> | <code>/drop &lt;CODE&gt;</code>
Hotfix a grade or rollback (soft-delete) a module.

<b>━━━━━━━━━━━━━━━━━━</b>
<i>Help:</i> <code>/lobang</code> | <code>/man</code> | <code>/help</code>
  `.trim();

  await replyWithFlavor(ctx, manual, "casual");
}

/**
 * Register lobang command
 */
export function registerLobangCommand(bot: Telegraf): void {
  bot.command("lobang", handleLobangCommand);
  bot.command("help", handleLobangCommand);
  bot.command("man", handleLobangCommand); 
}