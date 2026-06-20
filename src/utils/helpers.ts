import type { TreatmentType, Priority, FollowUpStatus, ResultStatus } from '@/types';

export function formatDate(date: Date | string, format: 'full' | 'date' | 'time' = 'full'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  
  if (format === 'date') return `${y}-${m}-${day}`;
  if (format === 'time') return `${h}:${min}`;
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

export function getTodayStr(): string {
  return formatDate(new Date(), 'date');
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getPriorityLabel(priority: Priority): string {
  const map: Record<Priority, string> = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级'
  };
  return map[priority];
}

export function getTreatmentLabel(type: TreatmentType): string {
  const map: Record<TreatmentType, string> = {
    implant: '种植牙',
    extraction: '拔牙',
    root_canal: '根管治疗'
  };
  return map[type];
}

export function getTreatmentShortLabel(type: TreatmentType): string {
  const map: Record<TreatmentType, string> = {
    implant: '种植',
    extraction: '拔牙',
    root_canal: '根管'
  };
  return map[type];
}

export function getStatusLabel(status: FollowUpStatus): string {
  const map: Record<FollowUpStatus, string> = {
    pending: '待回访',
    completed: '已完成',
    delayed: '已延后',
    missed: '未接听'
  };
  return map[status];
}

export function getResultLabel(result: ResultStatus): string {
  const map: Record<ResultStatus, string> = {
    normal: '恢复正常',
    need_review: '需医生复核',
    rebook: '预约复诊'
  };
  return map[result];
}

export function getGenderLabel(gender: 'male' | 'female'): string {
  return gender === 'male' ? '男' : '女';
}

export function getDayStageLabel(days: number): string {
  if (days === 0) return '术后当天';
  if (days === 1) return '术后第1天';
  return `术后第${days}天`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
