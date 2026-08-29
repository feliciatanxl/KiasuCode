import mysql from 'mysql2/promise'
import type { PoolOptions, RowDataPacket } from 'mysql2/promise'

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.MYSQL_URL?.trim()

function validateDatabaseUrl(value: string): string {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(value)
  } catch {
    throw new Error('DATABASE_URL or MYSQL_URL must be a valid connection URL.')
  }

  if (parsedUrl.protocol !== 'mysql:' && parsedUrl.protocol !== 'mysql2:') {
    throw new Error('DATABASE_URL or MYSQL_URL must use the mysql:// protocol.')
  }

  return value
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getLocalDatabasePort(): number {
  const value = process.env.DB_PORT?.trim() || '3306'
  const port = Number(value)

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('DB_PORT must be a valid TCP port number.')
  }

  return port
}

const sharedPoolOptions = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
} satisfies PoolOptions

const poolOptions: PoolOptions = databaseUrl
  ? {
      uri: validateDatabaseUrl(databaseUrl),
      ...sharedPoolOptions,
    }
  : {
      host: requireEnvironmentVariable('DB_HOST'),
      port: getLocalDatabasePort(),
      user: requireEnvironmentVariable('DB_USER'),
      password: requireEnvironmentVariable('DB_PASSWORD'),
      database: requireEnvironmentVariable('DB_NAME'),
      ...sharedPoolOptions,
    }

export const db = mysql.createPool(poolOptions)

interface DatabaseIdentityRow extends RowDataPacket {
  databaseName: string | null
  serverHost: string
}

db.getConnection()
  .then(async (connection) => {
    try {
      const [rows] = await connection.query<DatabaseIdentityRow[]>(
        'SELECT DATABASE() AS databaseName, @@hostname AS serverHost',
      )
      const databaseName = rows[0]?.databaseName ?? '(no default database)'
      const serverHost = rows[0]?.serverHost ?? 'unknown host'
      const databaseTarget = databaseUrl ? 'Railway Cloud DB' : 'Local DB'

      console.log(
        `[Database] Successfully connected to: ${databaseTarget} (${databaseName} on ${serverHost})`,
      )
    } finally {
      connection.release()
    }
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)

    console.error('[Database] Connection failed:', message)
  })
