export class Utilities {
    public static getDate(after: number = 0, unit: "ms" | "s" | "min" | "hour" | "day" | "month" | "year" = "day"): Date {
        switch (unit) {
            case "ms":
                return new Date(Date.now() + after);
            case "s":
                return new Date(Date.now() + after * 1000);
            case "min":
                return new Date(Date.now() + after * 60 * 1000);
            case "hour":
                return new Date(Date.now() + after * 60 * 60 * 1000);
            case "day":
                return new Date(Date.now() + after * 24 * 60 * 60 * 1000);
            case "month":
                return new Date(Date.now() + after * 30 * 24 * 60 * 60 * 1000);
            case "year":
                return new Date(Date.now() + after * 365 * 24 * 60 * 60 * 1000);
        }
    }
}