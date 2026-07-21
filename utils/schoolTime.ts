export const SCHOOL_TIME_ZONE = "America/Toronto";

type SchoolDateParts = {
  year: number;
  month: number;
  day: number;
};

type SchoolDateTimeParts = SchoolDateParts & {
  hour: number;
  minute: number;
  second: number;
};

const schoolDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const schoolDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const getPartNumber = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) => {
  const value = Number(parts.find((part) => part.type === type)?.value);
  return Number.isFinite(value) ? value : 0;
};

const getSchoolDateParts = (date: Date): SchoolDateParts => {
  const parts = schoolDateFormatter.formatToParts(date);
  return {
    year: getPartNumber(parts, "year"),
    month: getPartNumber(parts, "month"),
    day: getPartNumber(parts, "day"),
  };
};

const getSchoolDateTimeParts = (date: Date): SchoolDateTimeParts => {
  const parts = schoolDateTimeFormatter.formatToParts(date);
  return {
    year: getPartNumber(parts, "year"),
    month: getPartNumber(parts, "month"),
    day: getPartNumber(parts, "day"),
    hour: getPartNumber(parts, "hour"),
    minute: getPartNumber(parts, "minute"),
    second: getPartNumber(parts, "second"),
  };
};

// Use noon UTC so the same Toronto calendar date survives device timezone shifts.
export const createSchoolDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

export const normalizeSchoolPickerDate = (date: Date) => {
  const { year, month, day } = getSchoolDateParts(date);
  return createSchoolDate(year, month, day);
};

export const getTodayInSchoolTimeZone = (from = new Date()) =>
  normalizeSchoolPickerDate(from);

export const getSchoolDateString = (date: Date) => {
  const { year, month, day } = getSchoolDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const parseSchoolDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    day < 1
  ) {
    return new Date(dateString);
  }

  return createSchoolDate(year, month, day);
};

const getSchoolOffsetMs = (date: Date) => {
  const { year, month, day, hour, minute, second } =
    getSchoolDateTimeParts(date);
  const schoolClockAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
  );

  return schoolClockAsUtc - date.getTime();
};

export const parseSchoolDateTime = (dateString: string, timeString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour = 0, minute = 0, second = 0] = timeString
    .split(":")
    .map(Number);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    Number.isNaN(second)
  ) {
    return new Date(`${dateString}T${timeString}`);
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const initialOffset = getSchoolOffsetMs(new Date(utcGuess));
  let parsedDate = new Date(utcGuess - initialOffset);
  const correctedOffset = getSchoolOffsetMs(parsedDate);

  if (correctedOffset !== initialOffset) {
    parsedDate = new Date(utcGuess - correctedOffset);
  }

  return parsedDate;
};

export const formatSchoolDate = (
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
) =>
  date.toLocaleDateString(locale, {
    ...options,
    timeZone: SCHOOL_TIME_ZONE,
  });

export const formatSchoolTime = (
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
) =>
  date.toLocaleTimeString(locale, {
    ...options,
    timeZone: SCHOOL_TIME_ZONE,
  });
