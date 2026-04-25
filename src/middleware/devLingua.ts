/**
 * Dev-Lingua Persona Middleware
 * This middleware injects Singlish + developer jargon into every bot response
 * LGTM - no need to hardcode slang into each command, steady lah
 */

import { Context, Middleware } from "telegraf";
import { DEV_LINGUA_FLAVORS } from "../types";

/**
 * Helper function to get random element from array
 */
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Inject a random Dev-Lingua flavor into the message
 */
function injectDevLingua(
  message: string,
  flavorType: keyof typeof DEV_LINGUA_FLAVORS
): string {
  const flavor = getRandomElement(DEV_LINGUA_FLAVORS[flavorType]);

  // Randomly choose whether to put flavor at start or end
  if (Math.random() > 0.5) {
    return `${message} - ${flavor}`;
  } else {
    return `${flavor}: ${message}`;
  }
}

/**
 * Main Dev-Lingua Middleware
 * Wraps the context's reply method to automatically inject flavor
 */
export const devLinguaMiddleware: Middleware<Context> = async (
  ctx,
  next
) => {
  // Save the original reply method and bind it directly to ctx
  // This completely avoids the 'this' context error!
  const originalReply = ctx.reply.bind(ctx);

  // Use an arrow function so TypeScript doesn't panic over 'this'
  ctx.reply = ((
    text: string,
    extra?: Parameters<Context["reply"]>[1]
  ) => {
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
    return originalReply(enhancedText, extra);
  }) as typeof ctx.reply;

  // Continue to next middleware
  await next();
};

/**
 * Alternative: Selective Dev-Lingua Middleware
 * Use this explicitly in your command handlers for fine-grained control
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