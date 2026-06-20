import {
  format,
  parseISO,
  startOfWeek,
  addDays,
  getDay,
} from 'date-fns';

export function getWeekDates(referenceDate: Date = new Date()): Date[] {
  const monday = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(monday, i));
  }
  return dates;
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatTime(time: string): string {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
}

export function parseDate(dateStr: string): Date {
  return parseISO(dateStr);
}

export function getDayOfWeek(date: Date): number {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1;
}

export function calculateHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const diffMinutes = endMinutes - startMinutes;
  return diffMinutes / 60;
}

export function isTimeOverlap(
  s1Start: string,
  s1End: string,
  s2Start: string,
  s2End: string
): boolean {
  const [s1h, s1m] = s1Start.split(':').map(Number);
  const [e1h, e1m] = s1End.split(':').map(Number);
  const [s2h, s2m] = s2Start.split(':').map(Number);
  const [e2h, e2m] = s2End.split(':').map(Number);

  const start1 = s1h * 60 + s1m;
  const end1 = e1h * 60 + e1m;
  const start2 = s2h * 60 + s2m;
  const end2 = e2h * 60 + e2m;

  return start1 < end2 && start2 < end1;
}
