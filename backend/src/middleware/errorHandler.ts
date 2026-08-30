import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express'

export class AppError extends Error {
  readonly statusCode: number
  readonly code: string | undefined
  readonly expose: boolean

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    options?: { cause?: unknown; expose?: boolean },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.expose = options?.expose ?? statusCode < 500
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export const notFoundHandler: RequestHandler = (
  request: Request,
  _response: Response,
  next: NextFunction,
) => {
  next(new AppError(404, `Route ${request.method} ${request.path} was not found.`, 'ROUTE_NOT_FOUND'))
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  if (response.headersSent) {
    next(error)
    return
  }

  let normalizedError: AppError

  if (error instanceof AppError) {
    normalizedError = error
  } else if (
    error instanceof SyntaxError
    && isRecord(error)
    && error.type === 'entity.parse.failed'
  ) {
    normalizedError = new AppError(400, 'The request body contains invalid JSON.', 'INVALID_JSON')
  } else {
    normalizedError = new AppError(
      500,
      'An unexpected server error occurred.',
      'INTERNAL_SERVER_ERROR',
      { cause: error, expose: false },
    )
  }

  if (normalizedError.statusCode >= 500) {
    const errMessage = error instanceof Error ? error.message : String(error)
    console.error(
      '[%s %s] %s: %s',
      request.method,
      request.originalUrl,
      normalizedError.code ?? 'SERVER_ERROR',
      errMessage,
    )
  }

  response.status(normalizedError.statusCode).json({
    success: false,
    message: normalizedError.expose
      ? normalizedError.message
      : 'An unexpected server error occurred.',
    ...(normalizedError.code ? { code: normalizedError.code } : {}),
  })
}
