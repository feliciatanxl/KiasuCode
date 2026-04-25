import { Context, Telegraf } from "telegraf";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /lobang command
 * Displays the updated developer manual with all new drill-down features!
 */
export async function handleLobangCommand(ctx: Context): Promise<void> {
  const manual = `
📂 **KiasuCode Dev Manual v2.0**
_Build Status: STABLE_ ✅

🔄 **BRANCHING**
\`/checkout <SCHOOL> <YEAR> <SEM>\`
Switch your active repository branch.
_Example: /checkout NYP Y1 S1_

🚀 **COMMITTING**
\`/commit <CODE> <CR> <GRADE> <NAME>\`
Deploy a module to your current branch.
_Example: /commit IT1121 4 A AI & Data Analytics_

🔍 **KAYPOH (HISTORY)**
\`/kaypoh [SCHOOL] [YEAR] [SEM]\`
Drill down into your repo. Calculates local GPA automatically!
_Example: /kaypoh NYP Y1_

🛠️ **PATCHING**
\`/patch <CODE>\`
Open the interactive hotfix menu to edit a module.

📊 **BUILD STATUS**
\`/gpa\`
Fetch CGPA and module count for your current school.

🗑️ **ROLLBACK**
\`/drop <CODE>\`
Remove a module from your active branch.

---
*Help:* \`/lobang\` or \`/help\`
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