import { Context, Telegraf } from "telegraf";
import { replyWithFlavor } from "../middleware/devLingua";

/**
 * Handle the /lobang command
 * Displays the developer manual with build instructions
 */
export async function handleLobangCommand(ctx: Context): Promise<void> {
  const manual = `
KiasuCode Developer Manual

🚀 \`/commit <MOD> <CR> <GR>\`
Add a module to your build.
_Usage: /commit IT101 4 A_

📊 \`/gpa\`
Fetch your current Academic Build Status.

🗑️ \`/drop <MOD>\`
Drop a module from your repository.
_Usage: /remove IT101_

🛠️ \`/lobang\` or \`/help\`
Pull this manual from the repo.

*Build Status:* STABLE ✅
  `.trim();

  await replyWithFlavor(ctx, manual, "casual");
}

/**
 * Register lobang command - LGTM pattern
 */
export function registerLobangCommand(bot: Telegraf): void {
  bot.command("lobang", handleLobangCommand);
  bot.command("help", handleLobangCommand); // Alias for compatibility
}