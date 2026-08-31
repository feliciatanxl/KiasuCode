import { expect, test } from '@playwright/test'

test.describe('Solo Pomodoro timer modes', () => {
  test('resets durations by mode and never rewards completed breaks', async ({ page }) => {
    let studySessionRequests = 0
    let studySessionPayload: unknown = null

    await page.addInitScript(() => {
      const realNow = Date.now.bind(Date)
      let offsetMs = 0

      Object.defineProperty(window, '__advanceKiasuTimer', {
        value: (milliseconds: number) => {
          offsetMs += milliseconds
        },
      })
      Date.now = () => realNow() + offsetMs
    })

    await page.route('**/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'timer-test-user',
            name: 'Timer Tester',
            provider: 'local',
          },
        }),
      })
    })
    await page.route('**/api/modules', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          modules: [{
            id: 'module-1',
            moduleCode: 'CS1010',
            moduleName: 'Programming Methodology',
            creditUnits: 4,
          }],
        }),
      })
    })
    await page.route('**/api/study_sessions/heatmap', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ activity: [] }),
      })
    })
    await page.route('**/api/study/session', async (route) => {
      studySessionRequests += 1
      studySessionPayload = route.request().postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 'custom-session-1',
            moduleId: null,
            customCategory: 'Side Hustle',
            durationMinutes: 5,
            coinsEarned: 5,
            createdAt: new Date().toISOString(),
          },
          wallet: { coinsBalance: 5 },
        }),
      })
    })

    await page.goto('/timer')

    await expect(page.getByRole('button', { name: 'Focus', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator('output')).toHaveText('25:00')

    await page.getByRole('button', { name: 'Short Break' }).click()
    await expect(page.locator('output')).toHaveText('05:00')
    await page.getByRole('button', { name: 'Start Break' }).click()
    await page.evaluate(() => {
      const advanceTimer = (window as unknown as {
        __advanceKiasuTimer: (milliseconds: number) => void
      }).__advanceKiasuTimer

      advanceTimer(5 * 60 * 1000)
    })

    await expect(page.getByText('Short break complete. Ready to focus again?')).toBeVisible()
    expect(studySessionRequests).toBe(0)

    await page.getByRole('button', { name: 'Long Break' }).click()
    await expect(page.locator('output')).toHaveText('15:00')

    await page.getByRole('button', { name: 'Focus', exact: true }).click()
    for (let adjustment = 0; adjustment < 4; adjustment += 1) {
      await page.getByRole('button', { name: 'Increase focus duration by 5 minutes' }).click()
    }
    await expect(page.locator('output')).toHaveText('45:00')

    await page.locator('#module-picker').selectOption('custom')
    await page.getByLabel('Custom Category Name').fill('Side Hustle')
    await expect(page.getByRole('heading', { name: 'Side Hustle Pomodoro' })).toBeVisible()

    for (let adjustment = 0; adjustment < 4; adjustment += 1) {
      await page.getByRole('button', { name: 'Decrease focus duration by 5 minutes' }).click()
    }
    await page.getByRole('button', { name: 'Start Focus' }).click()
    await page.evaluate(() => {
      const advanceTimer = (window as unknown as {
        __advanceKiasuTimer: (milliseconds: number) => void
      }).__advanceKiasuTimer

      advanceTimer(5 * 60 * 1000)
    })

    await expect(page.getByText('Session logged. You earned 5 coins.')).toBeVisible()
    expect(studySessionRequests).toBe(1)
    expect(studySessionPayload).toEqual({
      module_id: null,
      custom_category: 'Side Hustle',
      duration_minutes: 5,
    })
  })
})
