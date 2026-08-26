import mysql from 'mysql2/promise'

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export const db = mysql.createPool({
  host: requireEnvironmentVariable('DB_HOST'),
  user: requireEnvironmentVariable('DB_USER'),
  password: requireEnvironmentVariable('DB_PASSWORD'),
  database: requireEnvironmentVariable('DB_NAME'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
})
