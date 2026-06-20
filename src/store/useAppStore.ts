import { create } from 'zustand';
import type { Patient, Doctor, FollowUpPlan, FollowUpRecord, Symptoms, ResultStatus, TreatmentType } from '@/types';
import { mockPatients, mockDoctors, mockPlans, mockRecords, defaultCurrentNurse } from '@/data/mockData';
import { TREATMENT_PRESETS } from '@/data/presets';
import { generateId, getTodayStr, addDays } from '@/utils/helpers';

interface AppStore {
  patients: Patient[];
  doctors: Doctor[];
  plans: FollowUpPlan[];
  records: FollowUpRecord[];
  currentNurse: string;

  addPatient: (patient: Omit<Patient, 'id'>) => Patient;
  getPatientById: (id: string) => Patient | undefined;
  getDoctorById: (id: string) => Doctor | undefined;
  createFollowUpPlans: (params: {
    patientId: string;
    treatmentType: TreatmentType;
    doctorId: string;
    selectedDays: number[];
    surgeryDate: string;
    instructions?: string;
    contraindications?: string;
  }) => FollowUpPlan[];

  completeFollowUp: (params: {
    planId: string;
    symptoms: Symptoms;
    resultStatus: ResultStatus;
    notes: string;
    contactSuccess: boolean;
  }) => void;

  delayFollowUp: (planId: string, delayType: '2h' | '4h' | 'tomorrow') => void;

  getTodayPlans: () => FollowUpPlan[];
  getPlansByPatientId: (patientId: string) => FollowUpPlan[];
  getRecordsByPatientId: (patientId: string) => FollowUpRecord[];
  getRecordsByPlanId: (planId: string) => FollowUpRecord | undefined;
  searchPlans: (filters?: {
    priority?: string;
    treatmentType?: string;
    keyword?: string;
  }) => FollowUpPlan[];
  searchRecords: (filters?: {
    startDate?: string;
    endDate?: string;
    keyword?: string;
    treatmentType?: string;
    resultStatus?: string;
  }) => FollowUpRecord[];
}

const STORAGE_KEY = 'dental-followup-data';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveToStorage(state: Partial<AppStore>) {
  try {
    const { patients, doctors, plans, records, currentNurse } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ patients, doctors, plans, records, currentNurse }));
  } catch {}
}

export const useAppStore = create<AppStore>((set, get) => {
  const stored = loadFromStorage();
  const initial = stored || {
    patients: mockPatients,
    doctors: mockDoctors,
    plans: mockPlans,
    records: mockRecords,
    currentNurse: defaultCurrentNurse
  };

  return {
    ...initial,

    addPatient: (patient) => {
      const newPatient: Patient = { ...patient, id: generateId() };
      set((s) => {
        const patients = [...s.patients, newPatient];
        saveToStorage({ ...s, patients });
        return { patients };
      });
      return newPatient;
    },

    getPatientById: (id) => get().patients.find(p => p.id === id),
    getDoctorById: (id) => get().doctors.find(d => d.id === id),

    createFollowUpPlans: ({ patientId, treatmentType, doctorId, selectedDays, surgeryDate, instructions, contraindications }) => {
      const preset = TREATMENT_PRESETS[treatmentType];
      const baseInstructions = instructions || preset.defaultInstructions;
      const baseContraindications = contraindications || preset.defaultContraindications;
      const surgery = new Date(surgeryDate);
      const newPlans: FollowUpPlan[] = selectedDays.map(day => ({
        id: generateId(),
        patientId,
        treatmentType,
        doctorId,
        daysAfterSurgery: day,
        scheduledDate: (() => {
          const d = addDays(surgery, day);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        priority: preset.priorityMap[day] || 'low',
        status: 'pending',
        createdAt: new Date().toISOString(),
        instructions: baseInstructions,
        contraindications: baseContraindications
      }));
      set((s) => {
        const plans = [...s.plans, ...newPlans];
        saveToStorage({ ...s, plans });
        return { plans };
      });
      return newPlans;
    },

    completeFollowUp: ({ planId, symptoms, resultStatus, notes, contactSuccess }) => {
      const plan = get().plans.find(p => p.id === planId);
      if (!plan) return;
      const record: FollowUpRecord = {
        id: generateId(),
        planId,
        patientId: plan.patientId,
        symptoms,
        resultStatus,
        notes,
        nurseName: get().currentNurse,
        contactSuccess,
        followUpDate: getTodayStr()
      };
      set((s) => {
        const plans = s.plans.map(p => p.id === planId ? { ...p, status: 'completed' as const } : p);
        const records = [...s.records, record];
        saveToStorage({ ...s, plans, records });
        return { plans, records };
      });
    },

    delayFollowUp: (planId, delayType) => {
      set((s) => {
        const plans = s.plans.map(p => {
          if (p.id !== planId) return p;
          let newDate = p.scheduledDate;
          if (delayType === 'tomorrow') {
            const d = addDays(new Date(p.scheduledDate), 1);
            newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
          return {
            ...p,
            status: 'delayed' as const,
            scheduledDate: newDate,
            delayedTimes: (p.delayedTimes || 0) + 1
          };
        });
        saveToStorage({ ...s, plans });
        return { plans };
      });
    },

    getTodayPlans: () => {
      const today = getTodayStr();
      return get().plans.filter(p => p.scheduledDate === today && p.status !== 'completed');
    },

    getPlansByPatientId: (patientId) =>
      get().plans
        .filter(p => p.patientId === patientId)
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),

    getRecordsByPatientId: (patientId) =>
      get().records
        .filter(r => r.patientId === patientId)
        .sort((a, b) => b.followUpDate.localeCompare(a.followUpDate)),

    getRecordsByPlanId: (planId) => get().records.find(r => r.planId === planId),

    searchPlans: (filters) => {
      let result = [...get().plans];
      if (!filters) return result;
      const { priority, treatmentType, keyword } = filters;
      if (priority && priority !== 'all') {
        result = result.filter(p => p.priority === priority);
      }
      if (treatmentType && treatmentType !== 'all') {
        result = result.filter(p => p.treatmentType === treatmentType);
      }
      if (keyword) {
        const kw = keyword.toLowerCase();
        const matchedPatientIds = get().patients
          .filter(p => p.name.includes(keyword) || p.phone.includes(keyword))
          .map(p => p.id);
        result = result.filter(p => matchedPatientIds.includes(p.patientId));
      }
      return result;
    },

    searchRecords: (filters) => {
      let result = [...get().records];
      if (!filters) return result;
      const { startDate, endDate, keyword, treatmentType, resultStatus } = filters;
      if (startDate) {
        result = result.filter(r => r.followUpDate >= startDate);
      }
      if (endDate) {
        result = result.filter(r => r.followUpDate <= endDate);
      }
      if (keyword) {
        const kw = keyword.toLowerCase();
        const matchedPatientIds = get().patients
          .filter(p => p.name.includes(keyword) || p.phone.includes(keyword))
          .map(p => p.id);
        result = result.filter(r => matchedPatientIds.includes(r.patientId));
      }
      if (treatmentType && treatmentType !== 'all') {
        const matchedPlanIds = get().plans
          .filter(p => p.treatmentType === treatmentType)
          .map(p => p.id);
        result = result.filter(r => matchedPlanIds.includes(r.planId));
      }
      if (resultStatus && resultStatus !== 'all') {
        result = result.filter(r => r.resultStatus === resultStatus);
      }
      return result.sort((a, b) => b.followUpDate.localeCompare(a.followUpDate));
    }
  };
});
