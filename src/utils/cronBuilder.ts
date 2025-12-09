// src/utils/cronBuilder.ts
// Utility to convert human-readable schedule to cron expression

export interface ScheduleConfig {
  days: string[]; // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  time: string; // 'HH:mm' format, e.g., '15:45'
  timezone: string; // IANA timezone, e.g., 'America/New_York'
}

const DAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Convert human-readable schedule to cron expression
 * @param config Schedule configuration
 * @returns Cron expression (minute hour * * day-of-week)
 */
export function buildCronExpression(config: ScheduleConfig): string {
  const [hours, minutes] = config.time.split(':').map(Number);
  
  if (config.days.length === 0) {
    throw new Error('At least one day must be selected');
  }

  // If all 7 days selected, use * for day of week
  if (config.days.length === 7) {
    return `${minutes} ${hours} * * *`;
  }

  // Convert day names to cron day numbers (0-6, Sunday = 0)
  const dayNumbers = config.days
    .map(day => DAY_MAP[day.toLowerCase()])
    .sort((a, b) => a - b);

  // If consecutive days, use range (e.g., 1-5 for Mon-Fri)
  if (dayNumbers.length > 1) {
    const isConsecutive = dayNumbers.every((day, index) => {
      if (index === 0) return true;
      const prev = dayNumbers[index - 1];
      return day === prev + 1 || (prev === 6 && day === 0); // Handle Sunday wrap
    });

    if (isConsecutive && dayNumbers.length > 2) {
      // Check for wrap-around (e.g., [5, 6, 0] = Fri-Sun)
      if (dayNumbers[0] === 0 && dayNumbers[dayNumbers.length - 1] === 6) {
        // Handle wrap-around case - split into ranges
        const beforeSun = dayNumbers.filter(d => d !== 0);
        const afterSat = dayNumbers.filter(d => d !== 6);
        if (beforeSun.length > 0 && afterSat.length > 0) {
          return `${minutes} ${hours} * * ${beforeSun[0]}-${beforeSun[beforeSun.length - 1]},${afterSat[0]}-${afterSat[afterSat.length - 1]}`;
        }
      }
      return `${minutes} ${hours} * * ${dayNumbers[0]}-${dayNumbers[dayNumbers.length - 1]}`;
    }
  }

  // Otherwise, use comma-separated list
  return `${minutes} ${hours} * * ${dayNumbers.join(',')}`;
}

/**
 * Parse cron expression back to human-readable format (basic)
 * @param cronExpression Cron expression
 * @returns Partial schedule config (time only, days would need reverse mapping)
 */
export function parseCronExpression(cronExpression: string): { time: string } | null {
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) {
    return null;
  }

  const [minutes, hours] = parts;
  const time = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  
  return { time };
}

