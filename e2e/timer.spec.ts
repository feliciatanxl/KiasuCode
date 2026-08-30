import { expect, test } from '@playwright/test'

test.describe('Solo Pomodoro timer modes', () => {
  test('resets durations by mode and never rewards completed breaks', async ({ page }) => {
    let studySessionRequests = 0

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
    await page.route('**/api/study/session', async (route) => {
      studySessionRequests += 1
      await route.fulfill({ status: 500, body: '{}' })
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
  })
})
