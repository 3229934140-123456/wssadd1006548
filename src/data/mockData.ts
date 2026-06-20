import type { Patient, Doctor, FollowUpPlan, FollowUpRecord } from '@/types';
import { addDays, generateId, getTodayStr } from '@/utils/helpers';
import { TREATMENT_PRESETS } from '@/data/presets';

function makeDateStr(offsetDays: number): string {
  const d = addDays(new Date(), offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const mockPatients: Patient[] = [
  { id: 'p1', name: '张明华', phone: '138****2134', gender: 'male', age: 45, medicalRecordNo: 'MR20240001' },
  { id: 'p2', name: '李慧敏', phone: '139****4567', gender: 'female', age: 32, medicalRecordNo: 'MR20240002' },
  { id: 'p3', name: '王建国', phone: '136****8890', gender: 'male', age: 58, medicalRecordNo: 'MR20240003' },
  { id: 'p4', name: '陈美丽', phone: '137****1234', gender: 'female', age: 28, medicalRecordNo: 'MR20240004' },
  { id: 'p5', name: '刘志强', phone: '135****5678', gender: 'male', age: 50, medicalRecordNo: 'MR20240005' },
  { id: 'p6', name: '赵小燕', phone: '131****9012', gender: 'female', age: 36, medicalRecordNo: 'MR20240006' }
];

export const mockDoctors: Doctor[] = [
  { id: 'd1', name: '吴医生', title: '副主任医师', department: '种植科' },
  { id: 'd2', name: '孙医生', title: '主治医师', department: '口腔外科' },
  { id: 'd3', name: '周医生', title: '主治医师', department: '牙体牙髓科' },
  { id: 'd4', name: '郑医生', title: '主任医师', department: '种植科' }
];

function createPlans(): FollowUpPlan[] {
  const plans: FollowUpPlan[] = [];
  const today = getTodayStr();
  
  function addPlan(patientId: string, treatmentType: any, doctorId: string, surgeryOffset: number) {
    const surgeryDate = makeDateStr(surgeryOffset);
    const preset = TREATMENT_PRESETS[treatmentType];
    preset.defaultDays.forEach((day, idx) => {
      const schedDate = makeDateStr(surgeryOffset + day);
      let status: any = 'pending';
      if (schedDate < today) status = 'completed';
      if (schedDate === today && idx % 3 === 1) status = 'delayed';
      plans.push({
        id: generateId(),
        patientId,
        treatmentType,
        doctorId,
        daysAfterSurgery: day,
        scheduledDate: schedDate,
        priority: preset.priorityMap[day],
        status,
        createdAt: new Date().toISOString(),
        instructions: preset.defaultInstructions,
        contraindications: preset.defaultContraindications,
        delayedTimes: idx % 3 === 1 ? 1 : 0
      });
    });
  }
  
  addPlan('p1', 'implant', 'd1', 0);
  addPlan('p2', 'extraction', 'd2', 0);
  addPlan('p3', 'root_canal', 'd3', -1);
  addPlan('p4', 'implant', 'd4', -3);
  addPlan('p5', 'extraction', 'd2', -7);
  addPlan('p6', 'root_canal', 'd3', -2);
  
  return plans;
}

export const mockPlans: FollowUpPlan[] = createPlans();

export const mockRecords: FollowUpRecord[] = [
  {
    id: generateId(),
    planId: mockPlans.find(p => p.patientId === 'p4' && p.daysAfterSurgery === 0)?.id || 'r1',
    patientId: 'p4',
    symptoms: { pain: true, swelling: true, bleeding: false, medication: true, other: '' },
    resultStatus: 'normal',
    notes: '患者术后当天感觉轻微疼痛和肿胀，属正常反应，已嘱咐继续观察，按医嘱服药。',
    nurseName: '林护士',
    contactSuccess: true,
    followUpDate: makeDateStr(-3)
  },
  {
    id: generateId(),
    planId: mockPlans.find(p => p.patientId === 'p5' && p.daysAfterSurgery === 0)?.id || 'r2',
    patientId: 'p5',
    symptoms: { pain: false, swelling: false, bleeding: false, medication: true, other: '' },
    resultStatus: 'normal',
    notes: '患者拔牙后恢复良好，无明显不适，提醒按时拆线。',
    nurseName: '林护士',
    contactSuccess: true,
    followUpDate: makeDateStr(-7)
  },
  {
    id: generateId(),
    planId: mockPlans.find(p => p.patientId === 'p5' && p.daysAfterSurgery === 3)?.id || 'r3',
    patientId: 'p5',
    symptoms: { pain: false, swelling: false, bleeding: false, medication: false, other: '' },
    resultStatus: 'normal',
    notes: '恢复正常，安排3天后复查拆线。',
    nurseName: '王护士',
    contactSuccess: true,
    followUpDate: makeDateStr(-4)
  }
];

export const defaultCurrentNurse = '林护士';
