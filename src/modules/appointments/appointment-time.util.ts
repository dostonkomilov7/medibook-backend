// Appointment times are free text ("9:30 AM", no leading zero) — the same
// strings the booking wizard and the doctor's schedule page send. The parsing
// and "is it in the past" rules live here as pure functions (no framework or
// "@/" imports) so they can be unit-tested without any Nest/DB setup.

export const DEFAULT_CLINIC_TIME_ZONE = "Asia/Tashkent"

export const APPOINTMENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
export const APPOINTMENT_TIME_PATTERN = /^(1[0-2]|[1-9]):[0-5]\d (AM|PM)$/

// Deliberately more forgiving than APPOINTMENT_TIME_PATTERN: it is used to
// compare against rows that are already stored, which may not match today's
// strict input format ("09:30 am").
const STORED_TIME_PATTERN = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i

// "12:00 AM" -> 0, "9:30 AM" -> 570, "1:00 PM" -> 780; null when unparseable.
export function timeToMinutes(time: string): number | null {
    const match = STORED_TIME_PATTERN.exec(time ?? "")

    if (!match) return null

    const hours = Number(match[1])
    const minutes = Number(match[2])

    if (hours < 1 || hours > 12 || minutes > 59) return null

    return (hours % 12) * 60 + minutes + (match[3].toUpperCase() === "PM" ? 12 * 60 : 0)
}

// Rejects shapes that look like a date but aren't one ("2025-02-30").
export function isValidCalendarDate(date: string): boolean {
    if (!APPOINTMENT_DATE_PATTERN.test(date)) return false

    const [year, month, day] = date.split("-").map(Number)
    const parsed = new Date(Date.UTC(year, month - 1, day))

    return parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day
}

// An unknown/misspelled zone would make Intl throw on every booking, so fall
// back to the default instead of taking the whole endpoint down.
export function resolveClinicTimeZone(timeZone?: string): string {
    if (!timeZone) return DEFAULT_CLINIC_TIME_ZONE

    try {
        new Intl.DateTimeFormat("en-US", { timeZone })
        return timeZone
    } catch {
        return DEFAULT_CLINIC_TIME_ZONE
    }
}

// "Today" and "now" as the clinic sees them. The server usually runs in UTC,
// which is still on the previous calendar day for the first hours after
// midnight in Tashkent — so the server's own clock can't be used directly.
export function getClinicNow(timeZone: string, now: Date = new Date()): { date: string, minutes: number } {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(now)

    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"

    return {
        date: `${part("year")}-${part("month")}-${part("day")}`,
        minutes: Number(part("hour")) * 60 + Number(part("minute")),
    }
}

// True when the slot has already started (or is starting this very minute)
// in the clinic's time zone. Expects a valid date/time — see the checks above.
export function isInThePast(date: string, time: string, timeZone: string, now: Date = new Date()): boolean {
    const clinicNow = getClinicNow(timeZone, now)

    // YYYY-MM-DD strings sort chronologically, so plain comparison is enough.
    if (date < clinicNow.date) return true
    if (date > clinicNow.date) return false

    const slotMinutes = timeToMinutes(time)

    return slotMinutes !== null && slotMinutes <= clinicNow.minutes
}
