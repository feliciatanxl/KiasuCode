import { test, expect } from '@playwright/test'

test.describe('Telegram OAuth Authentication Flow', () => {
  test('authenticates via Telegram callback, captures httpOnly session cookie, and redirects to dashboard', async ({
    page,
    context,
  }) => {
    const mockUser = {
      id: 'usr_telegram_mock_001',
      name: 'Kiasu Hacker',
      provider: 'telegram' as const,
      photoUrl: 'https://cdn.kiasucode.dev/avatars/user.png',
    }

    const mockSessionCookieValue = 'mock.jwt.kiasucode_session_payload.signature'
    let isAuthenticated = false

    // Mock Telegram OAuth API verification endpoint
    await page.route('**/auth/telegram', async (route) => {
      if (route.request().method() === 'POST') {
        isAuthenticated = true
        await context.addCookies([
          {
            name: 'kiasucode_session',
            value: mockSessionCookieValue,
            url: 'http://localhost:5173',
            httpOnly: true,
            sameSite: 'Strict',
          },
        ])
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': 'http://localhost:5173',
            'access-control-allow-credentials': 'true',
          },
          body: JSON.stringify({
            user: mockUser,
          }),
        })
      } else {
        await route.fallback()
      }
    })

    // Mock session restore endpoint
    await page.route('**/auth/session', async (route) => {
      if (isAuthenticated) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': 'http://localhost:5173',
            'access-control-allow-credentials': 'true',
          },
          body: JSON.stringify({
            user: mockUser,
          }),
        })
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': 'http://localhost:5173',
            'access-control-allow-credentials': 'true',
          },
          body: JSON.stringify({
            error: 'Session unauthenticated',
          }),
        })
      }
    })

    // Mock initial dashboard API calls
    await page.route('**/api/institutions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': 'http://localhost:5173',
          'access-control-allow-credentials': 'true',
        },
        body: JSON.stringify({ institutions: [] }),
      })
    })

    await page.route('**/api/countdowns', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': 'http://localhost:5173',
          'access-control-allow-credentials': 'true',
        },
        body: JSON.stringify({ countdowns: [] }),
      })
    })

    // 1. Navigate to the login page
    await page.goto('/login')

    // Verify login page loaded cleanly
    await expect(page.locator('#login-title')).toContainText('Sign in. Ship steady.')

    // 2. Wait for Telegram widget hook to mount on window
    await page.waitForFunction(() => {
      return typeof (window as unknown as { onKiasuCodeTelegramAuth?: unknown }).onKiasuCodeTelegramAuth === 'function'
    })

    // 3. Simulate Telegram authorization callback dispatch
    await page.evaluate(() => {
      const callback = (window as unknown as {
        onKiasuCodeTelegramAuth: (data: {
          id: number
          first_name: string
          username: string
          auth_date: number
          hash: string
        }) => void
      }).onKiasuCodeTelegramAuth

      callback({
        id: 987654321,
        first_name: 'Kiasu',
        username: 'kiasuhacker',
        auth_date: Math.floor(Date.now() / 1000),
        hash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      })
    })

    // 4. Assert client-side redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('h1')).toContainText('Academic Institutions')

    // 5. Assert browser context captured the secure httpOnly cookie
    const cookies = await context.cookies()
    const sessionCookie = cookies.find((c) => c.name === 'kiasucode_session')

    expect(sessionCookie).toBeDefined()
    expect(sessionCookie?.value).toBe(mockSessionCookieValue)
    expect(sessionCookie?.httpOnly).toBe(true)
  })
})
