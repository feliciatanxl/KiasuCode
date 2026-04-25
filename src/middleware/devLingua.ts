/**
 * Dev-Lingua Persona Middleware
 * This middleware injects Singlish + developer jargon into every bot response
 * Chiong this middleware first, then all responses get the vibe automatically!
 * LGTM - no need to hardcode slang into each command, steady lah
 */

import { Context, Middleware } from "telegraf";
import { DEV_LINGUA_FLAVORS } from "../types";

/**
 * Helper function to get random element from array
 * Simple utility - lah, just pick one lor
 */
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Inject a random Dev-Lingua flavor into the message
 * This function adds Singlish personality to any message
 * @param message - The original bot message
 * @param flavorType - Which pool of flavors to use (positive/negative/casual)
 * @returns Enhanced message with Dev-Lingua flavor
 */
function injectDevLingua(
  message: string,
  flavorType: keyof typeof DEV_LINGUA_FLAVORS
): string {
  const flavor = getRandomElement(
    DEV_LINGUA_FLAVORS[flavorType as keyof typeof DEV_LINGUA_FLAVORS]
  );

  // Randomly choose whether to put flavor at start or end
  if (Math.random() > 0.5) {
    return `${message} - ${flavor}`;
  } else {
    return `${flavor}: ${message}`;
  }
}

/**
 * Custom wrapper for ctx.reply() that injects Dev-Lingua automatically
 * This is the magic sauce - every time bot replies, it gets the vibe!
 * @param originalReply - The original ctx.reply function
 * @param flavorType - Type of flavor to inject (default: casual)
 * @returns Wrapped reply function that adds Dev-Lingua
 */
function createDevLinguaReply(
  originalReply: Context["reply"],
  flavorType: keyof typeof DEV_LINGUA_FLAVORS = "casual"
) {
  return function (
    text: string,
    extra?: Parameters<Context["reply"]>[1]
  ): ReturnType<Context["reply"]> {
    const enhancedText = injectDevLingua(text, flavorType);
    return originalReply.call(this, enhancedText, extra);
  };
}

/**
 * Main Dev-Lingua Middleware
 * This middleware wraps the context's reply method to automatically inject flavor
 * Attach this to bot.use() for global effect on all commands
 *
 * How it works:
 * 1. Intercepts ctx.reply() calls
 * 2. Detects the tone of the response (success/error/casual)
 * 3. Injects appropriate Dev-Lingua flavor
 * 4. Sends enhanced message to user
 *
 * Production-ready middleware pattern - no merge conflict here!
 */
export const devLinguaMiddleware: Middleware<Context> = async (
  ctx,
  next
) => {
  // Save the original reply method - must preserve reference
  const originalReply = ctx.reply;

  /**
   * Determine flavor type based on message content
   * Shiok - smart detection of message tone
   */
  ctx.reply = function (
    text: string,
    extra?: Parameters<Context["reply"]>[1]
  ): ReturnType<Context["reply"]> {
    let flavorType: keyof typeof DEV_LINGUA_FLAVORS = "casual";

    // Auto-detect flavor based on common response patterns
    if (
      text.toLowerCase().includes("error") ||
      text.toLowerCase().includes("failed") ||
      text.toLowerCase().includes("invalid") ||
      text.toLowerCase().includes("cannot")
    ) {
      flavorType = "negative";
    } else if (
      text.toLowerCase().includes("success") ||
      text.toLowerCase().includes("added") ||
      text.toLowerCase().includes("updated") ||
      text.toLowerCase().includes("committed")
    ) {
      flavorType = "positive";
    }

    // Inject the flavor and send
    const enhancedText = injectDevLingua(text, flavorType);
    return originalReply.call(this, enhancedText, extra);
  };

  // Bind the new reply to proper context - no reference issues lor
  ctx.reply = ctx.reply.bind(ctx);

  // Continue to next middleware - LGTM, no blocking here
  await next();
};

/**
 * Alternative: Selective Dev-Lingua Middleware
 * Use this if you want to inject flavor only in specific commands
 * Call this explicitly in your command handlers for fine-grained control
 * @param ctx - Telegraf context
 * @param message - Message to enhance
 * @param flavorType - Type of flavor to inject
 * @returns Promise<void>
 */
export async function replyWithFlavor(
  ctx: Context,
  message: string,
  flavorType: keyof typeof DEV_LINGUA_FLAVORS = "casual"
): Promise<void> {
  const enhancedMessage = injectDevLingua(message, flavorType);
  await ctx.reply(enhancedMessage);
}

export default devLinguaMiddleware;
