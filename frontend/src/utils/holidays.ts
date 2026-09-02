import type { AcademicCountdown } from '@kiasucode/shared'

export interface SingaporePublicHoliday {
  date: string
  localName: string
  name: string
  countryCode: string
  fixed: boolean
  global: boolean
  counties: string[] | null
  launchYear: number | null
  types: string[]
}

export async function fetchSingaporePublicHolidays(
  year: number = new Date().getFullYear(),
  signal?: AbortSignal,
): Promise<AcademicCountdown[]> {
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/SG`, {
      signal,
    })

    if (!response.ok) {
      console.warn(`Could not load Singapore public holidays: status ${response.status}`)
      return []
    }

    const data = (await response.json()) as SingaporePublicHoliday[]
    if (!Array.isArray(data)) return []

    return data.map((holiday) => ({
      id: `ph-${holiday.date}-${holiday.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
      moduleId: null,
      title: holiday.localName || holiday.name,
      targetDate: `${holiday.date}T00:00:00.000Z`,
      category: 'PH',
      color: '#ef4444',
      isAnnual: false,
      isReadOnly: true,
      createdAt: new Date().toISOString(),
    }))
  } catch (error) {
    console.warn('Error fetching Singapore public holidays:', error)
    return []
  }
}
