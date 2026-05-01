import { Context, Telegraf } from "telegraf";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /lobang command
 * Displays the updated developer manual v2.2 (Staging Update)
 */
export async function handleLobangCommand(ctx: Context): Promise<void> {
  const manual = `
📂 <b>KiasuCode Dev Manual v2.2</b>
<i>Build Status: STABLE (Staging Ops Integrated)</i> ✅

🔄 <b>BRANCHING (REPOS)</b>
<code>/checkout &lt;SCHOOL&gt; &lt;YEAR&gt; &lt;SEM&gt;</code>
Switch your active repository branch.
<i>Example: /checkout NYP Y1 S1</i>

🚀 <b>COMMITTING (PRODUCTION)</b>
<code>/commit &lt;CODE&gt; &lt;CR&gt; &lt;GRADE&gt; &lt;NAME&gt;</code>
Deploy a real module grade to your active branch.
<i>Example: /commit IT1121 4 A AI &amp; Data Analytics</i>

🧪 <b>STAGING (SIMULATION)</b>
<code>/agak_agak &lt;MOD&gt; &lt;NAME&gt; &lt;SCORE&gt; &lt;WEIGHT%&gt; [TARGET%]</code>
Forecast targets. 80% is the default "A" target.
<i>Example: /agak_agak IT1234 Quiz 18/20 20</i>

<code>/salah &lt;MOD&gt;</code>
Alamak! Undo the last component entry in staging.

<code>/flush &lt;MOD&gt; or --all</code>
Purge the staging cache. ⚠️ <i>Interactive confirmation required.</i>

🔍 <b>KAYPOH (HISTORY)</b>
<code>/kaypoh [SCHOOL] [YEAR] [SEM]</code>
Drill down into your repo. Calculates local GPA automatically!

🛠️ <b>PATCHING</b>
<code>/patch &lt;CODE&gt;</code>
Open the hotfix menu to edit a production module.

📊 <b>BUILD STATUS</b>
<code>/gpa</code> | <code>/logs</code>
Fetch CGPA summary or full commit history.

🎯 <b>CHIONG (PROJECTION)</b>
<code>/chiong &lt;CREDITS_LEFT&gt; &lt;TARGET_CGPA&gt;</code>
Calculate the safety margin needed to hit your target.

🗑️ <b>ROLLBACK</b>
<code>/drop &lt;CODE&gt;</code>
Soft-delete a module (Move to Recycle Bin).

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