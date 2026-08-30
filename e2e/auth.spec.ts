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

    await page.route('https://telegram.org/js/telegram-login.js', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.Telegram = {
          Login: {
            auth: (_options, callback) => callback({ id_token: 'mock.telegram.id-token' })
          }
        };`,
      })
    })

    await page.route('**/auth/telegram/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ clientId: '123456789' }),
      })
    })

    // Mock session restore endpoint
    await page.route('**/auth/session', async (route) => {
      if (route.request().method() === 'POST') {
        isAuthenticated = true
        await context.addCookies([
          {
            name: 'kiasucode_session',
            value: mockSessionCookieValue,
            url: 'http://localhost:5173',
            httpOnly: true,
            sameSite: 'Lax',
          },
        ])
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': 'http://localhost:5173',
            'access-control-allow-credentials': 'true',
          },
          body: JSON.stringify({ user: mockUser }),
        })
      } else if (isAuthenticated) {
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

    // 2. Start the custom Telegram popup flow.
    await page.getByRole('button', { name: 'Continue with Telegram' }).click()

    // 3. Assert client-side redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('h1')).toContainText('Academic Institutions')

    // 4. Assert browser context captured the httpOnly cookie
    const cookies = await context.cookies()
    const sessionCookie = cookies.find((c) => c.name === 'kiasucode_session')

    expect(sessionCookie).toBeDefined()
    expect(sessionCookie?.value).toBe(mockSessionCookieValue)
    expect(sessionCookie?.httpOnly).toBe(true)
  })
})
