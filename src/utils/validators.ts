import type {
  Employee,
  Position,
  ScheduleShift,
  ValidationResult,
} from '../types';
import {
  calculateHours,
  getDayOfWeek,
  isTimeOverlap,
} from './dateUtils';

export function validateQualification(
  employee: Employee,
  position: Position
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const missingQualifications = position.requiredQualifications.filter(
    (q) => !employee.qualifications.includes(q)
  );

  if (missingQualifications.length > 0) {
    errors.push(
      `员工缺少岗位所需资质: ${missingQualifications.join('、')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateWeeklyHours(
  employee: Employee,
  shifts: ScheduleShift[],
  newShift?: ScheduleShift
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const employeeShifts = shifts.filter((s) => s.employeeId === employee.id);
  let totalHours = 0;

  for (const shift of employeeShifts) {
    if (newShift && shift.id === newShift.id) continue;
    totalHours += calculateHours(shift.startTime, shift.endTime);
  }

  if (newShift) {
    totalHours += calculateHours(newShift.startTime, newShift.endTime);
  }

  if (totalHours > employee.maxWeeklyHours) {
    errors.push(
      `周工时超限: 当前${totalHours.toFixed(1)}小时，上限${employee.maxWeeklyHours}小时`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateCrossStoreConflict(
  employeeId: string,
  allShifts: ScheduleShift[],
  date: string,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const conflictingShifts = allShifts.filter((s) => {
    if (s.employeeId !== employeeId) return false;
    if (s.date !== date) return false;
    if (excludeShiftId && s.id === excludeShiftId) return false;
    return isTimeOverlap(s.startTime, s.endTime, startTime, endTime);
  });

  if (conflictingShifts.length > 0) {
    const stores = conflictingShifts.map((s) => s.storeId);
    const uniqueStores = new Set(stores);
    if (uniqueStores.size > 1) {
      errors.push('存在同时段多店排班冲突');
    } else {
      errors.push('该时段已有排班冲突');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateAvailableTime(
  employee: Employee,
  date: Date,
  startTime: string,
  endTime: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const dayOfWeek = getDayOfWeek(date);
  const availableSlots = employee.availableTimes[dayOfWeek] || [];

  if (availableSlots.length === 0) {
    warnings.push('该员工当天未设置可用时间');
    return { valid: true, errors, warnings };
  }

  const isInAvailableTime = availableSlots.some((slot) => {
    const [slotStart, slotEnd] = slot.split('-');
    return isTimeOverlap(startTime, endTime, slotStart, slotEnd);
  });

  if (!isInAvailableTime) {
    warnings.push('排班时段不在员工可用时间范围内');
  }

  return {
    valid: true,
    errors,
    warnings,
  };
}

export function validateShiftEditable(
  shift: ScheduleShift
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (shift.isSettled) {
    errors.push('该班次已结算，不可编辑');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateSwapQualification(
  requester: Employee,
  target: Employee,
  requesterShift: ScheduleShift,
  targetShift: ScheduleShift,
  positions: Position[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requesterTargetPosition = positions.find(
    (p) => p.id === targetShift.positionId
  );
  const targetRequesterPosition = positions.find(
    (p) => p.id === requesterShift.positionId
  );

  if (requesterTargetPosition) {
    const requesterValidation = validateQualification(
      requester,
      requesterTargetPosition
    );
    if (!requesterValidation.valid) {
      errors.push(
        `申请人${requester.name}不具备目标岗位资质: ${requesterValidation.errors.join('；')}`
      );
    }
  }

  if (targetRequesterPosition) {
    const targetValidation = validateQualification(
      target,
      targetRequesterPosition
    );
    if (!targetValidation.valid) {
      errors.push(
        `对方${target.name}不具备原岗位资质: ${targetValidation.errors.join('；')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
