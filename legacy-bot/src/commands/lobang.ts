import { Context, Telegraf } from "telegraf";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /lobang command
 * Displays the updated developer manual v3.0 (Enterprise UI Update)
 */
export async function handleLobangCommand(ctx: Context): Promise<void> {
  const manual = `
📂 <b>KiasuCode Dev Manual v3.0</b>
<i>Build Status: ENTERPRISE UI DEPLOYED</i> ✅

<b>HOW TO NAVIGATE:</b>
KiasuCode now uses interactive "Smart Routers". Just tap a main hub and use the buttons!

🎛️ <b>COMMAND CENTER</b>
<code>/dashboard</code>
Your read-only telemetry hub.
• View Current CGPA
• Audit Full Logs
• Repo History (Kaypoh Drill-Down)
• View Task Deadlines

🛠️ <b>PRODUCTION ENVIRONMENT</b>
<code>/manage</code>
Your active repository manager.
• Commit new grades
• Switch Branches (Checkout)
• Add Deadlines
• Hotfix/Patch modules
• Drop/Remove modules

🧪 <b>STAGING SANDBOX</b>
<code>/staging</code>
Your stress-test environment.
• Forecast targets (Agak-Agak)
• Copium Simulator
• Chiong Safety Margin Check
• Spill Tea (View Forecast)

🔙 <b>SYSTEM RECOVERY</b>
<code>/undo</code>
The ultimate Ctrl+Z menu.
• Undo Last Commit
• Revert Branch Checkout
• Restore Dropped Module

⚙️ <b>SYSTEM SPECS</b>
<code>/specs</code>
View the full GPA grading architecture and supported clusters.

<b>━━━━━━━━━━━━━━━━━━━━━━</b>
<i>Shortcuts:</i> <code>/lobang</code> | <code>/help</code> | <code>/man</code>
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