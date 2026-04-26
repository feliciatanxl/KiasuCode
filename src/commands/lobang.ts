import { Context, Telegraf } from "telegraf";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /lobang command
 * Displays the updated developer manual with HTML-safe entities
 */
export async function handleLobangCommand(ctx: Context): Promise<void> {
  const manual = `
📂 <b>KiasuCode Dev Manual v2.0</b>
<i>Build Status: STABLE</i> ✅

🔄 <b>BRANCHING</b>
<code>/checkout &lt;SCHOOL&gt; &lt;YEAR&gt; &lt;SEM&gt;</code>
Switch your active repository branch.
<i>Example: /checkout NYP Y1 S1</i>

🚀 <b>COMMITTING</b>
<code>/commit &lt;CODE&gt; &lt;CR&gt; &lt;GRADE&gt; &lt;NAME&gt;</code>
Deploy a module to your current branch.
<i>Example: /commit IT1121 4 A AI &amp; Data Analytics</i>

🔍 <b>KAYPOH (HISTORY)</b>
<code>/kaypoh [SCHOOL] [YEAR] [SEM]</code>
Drill down into your repo. Calculates local GPA automatically!
<i>Example: /kaypoh NYP Y1</i>

🛠️ <b>PATCHING</b>
<code>/patch &lt;CODE&gt;</code>
Open the interactive hotfix menu to edit a module.

📊 <b>BUILD STATUS</b>
<code>/gpa</code>
Fetch CGPA and module count for your current school.

🎯 <b>CHIONG (PROJECTION)</b>
<code>/chiong &lt;CREDITS_LEFT&gt; &lt;TARGET_CGPA&gt;</code>
Calculate the safety margin needed to hit your target.
<i>Example: /chiong 20 3.7</i>

🗑️ <b>ROLLBACK</b>
<code>/drop &lt;CODE&gt;</code>
Remove a module from your active branch.

<b>━━━━━━━━━━━━━━━━━━</b>
<i>Help:</i> <code>/lobang</code> or <code>/help</code>
- no merge conflict here -
  `.trim();

  await replyWithFlavor(ctx, manual, "casual");
}

/**
 * Register lobang command
 */
export function registerLobangCommand(bot: Telegraf): void {
  bot.command("lobang", handleLobangCommand);
  bot.command("help", handleLobangCommand);
  bot.command("man", handleLobangCommand); // Added 'man' for that true Linux feel!
}