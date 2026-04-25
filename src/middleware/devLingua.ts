/**
 * Dev-Lingua Persona Middleware
 * Now with HTML styling for a cleaner, steady UI!
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
 * Uses HTML <i> tags to make the persona stand out
 */
function injectDevLingua(
  message: string,
  flavorType: keyof typeof DEV_LINGUA_FLAVORS
): string {
  const flavor = getRandomElement(DEV_LINGUA_FLAVORS[flavorType]);

  // Randomly choose whether to put flavor at start or end
  // Styled with italics for that "Developer Comment" look
  if (Math.random() > 0.5) {
    return `${message}\n\n<i>- ${flavor} -</i>`;
  } else {
    return `<b>${flavor.toUpperCase()}:</b> ${message}`;
  }
}

/**
 * Main Dev-Lingua Middleware
 * Wraps ctx.reply to automatically inject flavor and force HTML mode
 */
export const devLinguaMiddleware: Middleware<Context> = async (
  ctx,
  next
) => {
  const originalReply = ctx.reply.bind(ctx);

  ctx.reply = ((
    text: string,
    extra?: Parameters<Context["reply"]>[1]
  ) => {
    let flavorType: keyof typeof DEV_LINGUA_FLAVORS = "casual";

    // Auto-detect flavor based on common response patterns
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes("error") ||
      lowerText.includes("failed") ||
      lowerText.includes("invalid") ||
      lowerText.includes("cannot") ||
      lowerText.includes("conflict")
    ) {
      flavorType = "negative";
    } else if (
      lowerText.includes("success") ||
      lowerText.includes("added") ||
      lowerText.includes("updated") ||
      lowerText.includes("committed") ||
      lowerText.includes("deployed")
    ) {
      flavorType = "positive";
    }

    const enhancedText = injectDevLingua(text, flavorType);

    // Merge parse_mode: 'HTML' into extra options
    const finalExtra = {
      parse_mode: 'HTML' as const,
      ...extra
    };

    return originalReply(enhancedText, finalExtra);
  }) as typeof ctx.reply;

  await next();
};

/**
 * Alternative: Selective Dev-Lingua Middleware
 * For manual calls where you want to specify the flavor type
 */
export async function replyWithFlavor(
  ctx: Context,
  message: string,
  flavorType: keyof typeof DEV_LINGUA_FLAVORS = "casual",
  extra: any = {} // Added this to pass options
): Promise<void> {
  const enhancedMessage = injectDevLingua(message, flavorType);
  // 🔥 THE FIX: Must include parse_mode HTML here!
  await ctx.reply(enhancedMessage, { 
    parse_mode: 'HTML', 
    ...extra 
  });
}

export default devLinguaMiddleware;