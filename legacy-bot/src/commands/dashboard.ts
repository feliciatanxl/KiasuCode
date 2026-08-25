import { Context, Telegraf, Markup } from "telegraf";
import jwt from "jsonwebtoken"; // <-- Make sure to install this!
import { handleGpaCommand } from "./gpa";
import { handleLogsCommand } from "./logs";
import { handlePipelineCommand } from "./pipeline";
import { handleHistoryCommand } from "./kaypoh";

export async function handleDashboardMenu(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  // 🌐 Base URL configuration (fallback to local if running on your machine)
  const webUrl = process.env.WEB_URL || "https://kiasucode-production.up.railway.app";
  
  // 🔐 Secure Token Generation
  // We use a fallback secret for local dev, but you MUST set JWT_SECRET in Railway
  const jwtSecret = process.env.JWT_SECRET || "local-dev-super-secret-key";
  
  // Sign a token containing the userId, valid for exactly 1 hour
  const token = jwt.sign({ userId: userId }, jwtSecret, { expiresIn: '1h' });

  // 🔗 The new secure Magic Link
  const portalLink = `${webUrl}/auth/${token}`;

  const menuMsg = `🎛️ <b>KIASUCODE COMMAND CENTER</b>\nWhat telemetry data do you want to view?`;
  
  await ctx.reply(menuMsg, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🏆 View Current CGPA", "btn_dash_gpa")],
      [Markup.button.callback("📜 Audit Full Logs", "btn_dash_logs")],
      [Markup.button.callback("🔍 Repo History (Kaypoh)", "btn_dash_kaypoh")],
      [Markup.button.callback("📋 Task Pipeline", "btn_dash_pipeline")],
      [Markup.button.url("🌐 Secure Web Login", portalLink)] // <-- Updated label
    ])
  });
}

export function registerDashboardCommand(bot: Telegraf): void {
  bot.command("dashboard", handleDashboardMenu);
  bot.command("status", handleDashboardMenu);

  // --- SAFE BUTTON HANDLERS ---
  bot.action("btn_dash_gpa", async (ctx) => {
    await ctx.answerCbQuery("Fetching Build Status...");
    await handleGpaCommand(ctx); 
  });
  bot.action("btn_dash_logs", async (ctx) => {
    await ctx.answerCbQuery("Pulling Deployment Logs...");
    await handleLogsCommand(ctx); 
  });
  bot.action("btn_dash_kaypoh", async (ctx) => {
    await ctx.answerCbQuery("Fetching repo history...");
    await handleHistoryCommand(ctx); 
  });
  bot.action("btn_dash_pipeline", async (ctx) => {
    await ctx.answerCbQuery("Checking issue tracker...");
    await handlePipelineCommand(ctx); 
  });
}