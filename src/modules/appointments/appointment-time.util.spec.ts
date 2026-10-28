/// <reference types="jest" />
// (tsconfig limits global types to "node", so jest's globals are pulled in here)
import {
    APPOINTMENT_DATE_PATTERN,
    APPOINTMENT_TIME_PATTERN,
    DEFAULT_CLINIC_TIME_ZONE,
    getClinicNow,
    isInThePast,
    isValidCalendarDate,
    resolveClinicTimeZone,
    timeToMinutes,
} from "./appointment-time.util";

describe("appointment-time.util", () => {
    describe("timeToMinutes", () => {
        it.each([
            ["12:00 AM", 0],
            ["12:30 AM", 30],
            ["9:30 AM", 570],
            ["11:59 AM", 719],
            ["12:00 PM", 720],
            ["1:00 PM", 780],
            ["11:59 PM", 1439],
        ])("converts %s to %i", (input, expected) => {
            expect(timeToMinutes(input)).toBe(expected);
        });

        it("reads stored rows more leniently than new input", () => {
            expect(timeToMinutes("09:30 am")).toBe(570);
            expect(timeToMinutes(" 9:30  PM ")).toBe(21 * 60 + 30);
        });

        it.each(["", "9 AM", "13:00 PM", "0:30 AM", "9:60 AM", "noon", "9:30"])(
            "returns null for %p",
            (input) => {
                expect(timeToMinutes(input)).toBeNull();
            },
        );
    });

    describe("input patterns", () => {
        it("accepts the exact format the frontend sends", () => {
            expect(APPOINTMENT_TIME_PATTERN.test("9:30 AM")).toBe(true);
            expect(APPOINTMENT_TIME_PATTERN.test("12:00 PM")).toBe(true);
        });

        it.each(["09:30 AM", "9:30am", "9:30 am", "13:00 PM", "9:5 AM", "9:30 AM "])(
            "rejects time %p",
            (input) => {
                expect(APPOINTMENT_TIME_PATTERN.test(input)).toBe(false);
            },
        );

        it("only accepts YYYY-MM-DD shaped dates", () => {
            expect(APPOINTMENT_DATE_PATTERN.test("2030-01-05")).toBe(true);
            expect(APPOINTMENT_DATE_PATTERN.test("2030-1-5")).toBe(false);
            expect(APPOINTMENT_DATE_PATTERN.test("05/01/2030")).toBe(false);
        });
    });

    describe("isValidCalendarDate", () => {
        it("accepts real dates, including leap day", () => {
            expect(isValidCalendarDate("2025-02-28")).toBe(true);
            expect(isValidCalendarDate("2024-02-29")).toBe(true);
            expect(isValidCalendarDate("2025-12-31")).toBe(true);
        });

        it.each(["2025-02-30", "2025-02-29", "2025-13-01", "2025-00-10", "2025-04-31", "2025-1-01", "tomorrow"])(
            "rejects %p",
            (input) => {
                expect(isValidCalendarDate(input)).toBe(false);
            },
        );
    });

    describe("resolveClinicTimeZone", () => {
        it("falls back to the default when unset or invalid", () => {
            expect(resolveClinicTimeZone(undefined)).toBe(DEFAULT_CLINIC_TIME_ZONE);
            expect(resolveClinicTimeZone("")).toBe(DEFAULT_CLINIC_TIME_ZONE);
            expect(resolveClinicTimeZone("Not/AZone")).toBe(DEFAULT_CLINIC_TIME_ZONE);
        });

        it("keeps a valid zone", () => {
            expect(resolveClinicTimeZone("UTC")).toBe("UTC");
            expect(resolveClinicTimeZone("Europe/London")).toBe("Europe/London");
        });
    });

    describe("getClinicNow", () => {
        it("uses the clinic's calendar day, not the server's (UTC) one", () => {
            // 20:30 UTC on Jan 15 is already 01:30 on Jan 16 in Tashkent (UTC+5).
            const instant = new Date("2025-01-15T20:30:00Z");

            expect(getClinicNow("Asia/Tashkent", instant)).toEqual({ date: "2025-01-16", minutes: 90 });
            expect(getClinicNow("UTC", instant)).toEqual({ date: "2025-01-15", minutes: 20 * 60 + 30 });
        });

        it("reports midnight as 00:00, never 24:00", () => {
            expect(getClinicNow("Asia/Tashkent", new Date("2025-01-15T19:00:00Z"))).toEqual({
                date: "2025-01-16",
                minutes: 0,
            });
        });
    });

    describe("isInThePast", () => {
        // 10:00 on Jan 16 in Tashkent.
        const now = new Date("2025-01-16T05:00:00Z");
        const zone = "Asia/Tashkent";

        it("rejects earlier days and accepts later days regardless of the time", () => {
            expect(isInThePast("2025-01-15", "11:59 PM", zone, now)).toBe(true);
            expect(isInThePast("2025-01-17", "12:00 AM", zone, now)).toBe(false);
        });

        it("on the same day compares the slot's start with the current time", () => {
            expect(isInThePast("2025-01-16", "9:30 AM", zone, now)).toBe(true);
            expect(isInThePast("2025-01-16", "10:00 AM", zone, now)).toBe(true);
            expect(isInThePast("2025-01-16", "10:30 AM", zone, now)).toBe(false);
            expect(isInThePast("2025-01-16", "1:00 PM", zone, now)).toBe(false);
        });

        it("judges 'today' by the clinic zone", () => {
            // Same instant, but Jan 15 is already over in Tashkent while it is
            // still the current day in UTC.
            const lateEvening = new Date("2025-01-15T20:30:00Z");

            expect(isInThePast("2025-01-15", "11:59 PM", "Asia/Tashkent", lateEvening)).toBe(true);
            expect(isInThePast("2025-01-15", "11:59 PM", "UTC", lateEvening)).toBe(false);
        });
    });
});
