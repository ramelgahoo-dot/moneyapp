export type WeekOption = {
  key: string
  start: string
  end: string
  label: string
}

function asDateOnly(value: string) {
  return new Date(`${value}T00:00:00`)
}

function toDateKey(value: Date) {
  return value.toISOString().split('T')[0]
}

export function weekStartSunday(value: Date) {
  const start = new Date(value)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

export function weekEndSaturday(value: Date) {
  const start = weekStartSunday(value)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end
}

export function buildWeekOption(start: Date): WeekOption {
  const normalizedStart = weekStartSunday(start)
  const normalizedEnd = weekEndSaturday(start)
  const startKey = toDateKey(normalizedStart)
  const endKey = toDateKey(normalizedEnd)

  return {
    key: startKey,
    start: startKey,
    end: endKey,
    label: `${normalizedStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${normalizedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
  }
}

export function buildRecentWeekOptions(count: number, from = new Date()) {
  const latestStart = weekStartSunday(from)
  return Array.from({ length: Math.max(1, count) }, (_, idx) => {
    const start = new Date(latestStart)
    start.setDate(latestStart.getDate() - idx * 7)
    return buildWeekOption(start)
  })
}

export function findWeekOption(options: WeekOption[], key: string) {
  return options.find((option) => option.key === key) ?? null
}

export function isDateWithinWeek(date: string, week: WeekOption) {
  const value = asDateOnly(date)
  const start = asDateOnly(week.start)
  const end = asDateOnly(week.end)
  return value >= start && value <= end
}