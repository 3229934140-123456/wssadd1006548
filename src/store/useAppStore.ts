import { create } from 'zustand';
import type {
  Patient, Doctor, FollowUpPlan, FollowUpRecord, Symptoms, ResultStatus,
  TreatmentType, DoctorReviewStatus, RebookTask, SummaryRow,
  RebookTaskStatus, NurseSummaryRow, SummaryView
} from '@/types';
import { mockPatients, mockDoctors, mockPlans, mockRecords, mockRebookTasks, defaultCurrentNurse } from '@/data/mockData';
import { TREATMENT_PRESETS } from '@/data/presets';
import { generateId, getTodayStr, addDays, formatDate, getTreatmentLabel } from '@/utils/helpers';

interface AppStore {
  patients: Patient[];
  doctors: Doctor[];
  plans: FollowUpPlan[];
  records: FollowUpRecord[];
  rebookTasks: RebookTask[];
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
    doctorQuestion?: string;
  }) => void;

  delayFollowUp: (planId: string, delayType: '2h' | '4h' | 'tomorrow') => void;

  reviewByDoctor: (recordId: string, params: {
    reviewStatus: DoctorReviewStatus;
    reviewNote: string;
  }) => void;

  getPendingPlans: () => FollowUpPlan[];
  getSnoozedPlans: () => FollowUpPlan[];
  getOverduePlans: () => FollowUpPlan[];
  getPlansByPatientId: (patientId: string) => FollowUpPlan[];
  getRecordsByPatientId: (patientId: string) => FollowUpRecord[];
  getRecordsByPlanId: (planId: string) => FollowUpRecord | undefined;
  getPendingReviewRecords: () => FollowUpRecord[];

  getRebookTasks: (filters?: { status?: string }) => RebookTask[];
  getRebookTaskByRecordId: (recordId: string) => RebookTask | undefined;
  createRebookTask: (params: {
    recordId: string;
    doctorNote: string;
  }) => RebookTask | null;
  updateRebookTaskStatus: (taskId: string, params: {
    status: RebookTaskStatus;
    nurseNote?: string;
    appointmentDate?: string;
  }) => void;

  getPhoneTemplate: (treatmentType: TreatmentType) => string;

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
    doctorId?: string;
  }) => FollowUpRecord[];

  exportRecordsCsv: (filters?: {
    startDate?: string;
    endDate?: string;
    keyword?: string;
    treatmentType?: string;
    resultStatus?: string;
    doctorId?: string;
  }) => string;
  exportRecordsCsvWithSummary: (filters?: {
    startDate?: string;
    endDate?: string;
    keyword?: string;
    treatmentType?: string;
    resultStatus?: string;
    doctorId?: string;
  }) => string;

  getRecordsStats: (filters?: {
    startDate?: string;
    endDate?: string;
    keyword?: string;
    treatmentType?: string;
    resultStatus?: string;
    doctorId?: string;
  }) => { total: number; normal: number; needReview: number; rebook: number; normalPct: number; needReviewPct: number; rebookPct: number };
  getSummaryReport: (view: SummaryView, filters?: {
    startDate?: string;
    endDate?: string;
    treatmentType?: string;
    doctorId?: string;
  }) => SummaryRow[] | NurseSummaryRow[];

  getNurseSummaryReport: (filters?: {
    startDate?: string;
    endDate?: string;
    treatmentType?: string;
    doctorId?: string;
  }) => NurseSummaryRow[];

  exportRecordsCsvWithViewSummary: (view: SummaryView, filters?: {
    startDate?: string;
    endDate?: string;
    keyword?: string;
    treatmentType?: string;
    resultStatus?: string;
    doctorId?: string;
  }) => string;
}

const STORAGE_KEY = 'dental-followup-data';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (!data.rebookTasks) data.rebookTasks = [];
      if (!data.records) data.records = [];
      if (!data.plans) data.plans = [];
      return data;
    }
  } catch { }
  return null;
}

function saveToStorage(state: Partial<AppStore>) {
  try {
    const { patients, doctors, plans, records, rebookTasks, currentNurse } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ patients, doctors, plans, records, rebookTasks, currentNurse }));
  } catch { }
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: string, b: string): number {
  const da = parseDate(a);
  const db = parseDate(b);
  return Math.floor((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export const useAppStore = create<AppStore>((set, get) => {
  const stored = loadFromStorage();
  const initial = stored || {
    patients: mockPatients,
    doctors: mockDoctors,
    plans: mockPlans,
    records: mockRecords,
    rebookTasks: mockRebookTasks,
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

    completeFollowUp: ({ planId, symptoms, resultStatus, notes, contactSuccess, doctorQuestion }) => {
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
        followUpDate: getTodayStr(),
        doctorQuestion: resultStatus === 'need_review' ? doctorQuestion : undefined,
        doctorReviewStatus: resultStatus === 'need_review' ? 'pending' : undefined
      };
      set((s) => {
        const plans = s.plans.map(p => p.id === planId ? { ...p, status: 'completed' as const } : p);
        const records = [...s.records, record];
        saveToStorage({ ...s, plans, records });
        return { plans, records };
      });
    },

    delayFollowUp: (planId, delayType) => {
      const now = new Date();
      set((s) => {
        const plans = s.plans.map(p => {
          if (p.id !== planId) return p;
          let newDate = p.scheduledDate;
          let remindAt: string | undefined;
          let newStatus: FollowUpPlan['status'] = 'snoozed';
          if (delayType === 'tomorrow') {
            const d = addDays(now, 1);
            newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            remindAt = undefined;
            newStatus = 'pending';
          } else {
            const hours = delayType === '2h' ? 2 : 4;
            const remind = new Date(now.getTime() + hours * 60 * 60 * 1000);
            remindAt = remind.toISOString();
            newDate = getTodayStr();
          }
          return {
            ...p,
            status: newStatus,
            scheduledDate: newDate,
            remindAt,
            delayedTimes: (p.delayedTimes || 0) + 1
          };
        });
        saveToStorage({ ...s, plans });
        return { plans };
      });
    },

    reviewByDoctor: (recordId, { reviewStatus, reviewNote }) => {
      set((s) => {
        const records = s.records.map(r => {
          if (r.id !== recordId) return r;
          return {
            ...r,
            doctorReviewStatus: reviewStatus,
            doctorReviewNote: reviewNote,
            doctorReviewDate: getTodayStr()
          };
        });

        let rebookTasks = s.rebookTasks;
        if (reviewStatus === 'rebook_suggested') {
          const record = s.records.find(r => r.id === recordId);
          const plan = s.plans.find(p => p.id === record?.planId);
          if (record && plan) {
            const newTask: RebookTask = {
              id: generateId(),
              recordId,
              patientId: record.patientId,
              doctorId: plan.doctorId,
              treatmentType: plan.treatmentType,
              doctorNote: reviewNote,
              status: 'pending_contact',
              createdAt: new Date().toISOString(),
              createdBy: get().currentNurse
            };
            rebookTasks = [...s.rebookTasks, newTask];
          }
        }

        saveToStorage({ ...s, records, rebookTasks });
        return { records, rebookTasks };
      });
    },

    getPendingPlans: () => {
      const today = getTodayStr();
      const now = new Date();
      return get().plans.filter(p => {
        if (p.status === 'completed') return false;
        if (p.status === 'snoozed') {
          if (p.remindAt) {
            return new Date(p.remindAt) <= now;
          }
          return p.scheduledDate <= today;
        }
        return p.scheduledDate <= today;
      });
    },

    getSnoozedPlans: () => {
      const now = new Date();
      return get().plans.filter(p => {
        if (p.status !== 'snoozed') return false;
        if (p.remindAt) {
          return new Date(p.remindAt) > now;
        }
        return false;
      }).sort((a, b) => {
        if (!a.remindAt || !b.remindAt) return 0;
        return new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime();
      });
    },

    getOverduePlans: () => {
      const today = getTodayStr();
      return get().plans.filter(p => {
        if (p.status === 'completed') return false;
        return p.scheduledDate < today && p.status !== 'snoozed';
      });
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

    getPendingReviewRecords: () =>
      get().records
        .filter(r => r.resultStatus === 'need_review' && r.doctorReviewStatus === 'pending')
        .sort((a, b) => b.followUpDate.localeCompare(a.followUpDate)),

    getRebookTasks: (filters) => {
      let result = [...get().rebookTasks];
      if (filters?.status && filters.status !== 'all') {
        result = result.filter(t => t.status === filters.status);
      }
      return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    createRebookTask: ({ recordId, doctorNote }) => {
      const record = get().records.find(r => r.id === recordId);
      const plan = get().plans.find(p => p.id === record?.planId);
      if (!record || !plan) return null;

      const newTask: RebookTask = {
        id: generateId(),
        recordId,
        patientId: record.patientId,
        doctorId: plan.doctorId,
        treatmentType: plan.treatmentType,
        doctorNote,
        status: 'pending_contact',
        createdAt: new Date().toISOString(),
        createdBy: get().currentNurse
      };

      set((s) => {
        const rebookTasks = [...s.rebookTasks, newTask];
        saveToStorage({ ...s, rebookTasks });
        return { rebookTasks };
      });
      return newTask;
    },

    updateRebookTaskStatus: (taskId, { status, nurseNote, appointmentDate }) => {
      set((s) => {
        const rebookTasks = s.rebookTasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            status,
            nurseNote: nurseNote || t.nurseNote,
            contactDate: status === 'contacted' ? getTodayStr() : t.contactDate,
            appointmentDate: appointmentDate || t.appointmentDate,
            confirmedDate: status === 'confirmed' ? getTodayStr() : t.confirmedDate
          };
        });
        saveToStorage({ ...s, rebookTasks });
        return { rebookTasks };
      });
    },

    getRebookTaskByRecordId: (recordId) =>
      get().rebookTasks.find(t => t.recordId === recordId),

    getPhoneTemplate: (treatmentType) =>
      TREATMENT_PRESETS[treatmentType]?.phoneTemplate || '',

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
      const { startDate, endDate, keyword, treatmentType, resultStatus, doctorId } = filters;
      if (startDate) result = result.filter(r => r.followUpDate >= startDate);
      if (endDate) result = result.filter(r => r.followUpDate <= endDate);
      if (keyword) {
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
      if (doctorId && doctorId !== 'all') {
        const matchedPlanIds = get().plans
          .filter(p => p.doctorId === doctorId)
          .map(p => p.id);
        result = result.filter(r => matchedPlanIds.includes(r.planId));
      }
      return result.sort((a, b) => b.followUpDate.localeCompare(a.followUpDate));
    },

    exportRecordsCsv: (filters) => {
      const { getPatientById, getDoctorById, plans } = get();
      const records = get().searchRecords(filters);
      const headers = ['患者姓名', '性别', '年龄', '电话', '治疗项目', '回访阶段', '回访日期', '疼痛', '肿胀', '出血', '按时用药', '其他症状', '回访结果', '沟通备注', '操作护士', '医生复核状态'];
      const rows = records.map(r => {
        const p = getPatientById(r.patientId);
        const pl = plans.find(pp => pp.id === r.planId);
        const dr = pl ? getDoctorById(pl.doctorId) : null;
        return [
          p?.name || '',
          p ? (p.gender === 'male' ? '男' : '女') : '',
          p?.age || '',
          p?.phone || '',
          pl ? (pl.treatmentType === 'implant' ? '种植牙' : pl.treatmentType === 'extraction' ? '拔牙' : '根管治疗') : '',
          pl ? `术后第${pl.daysAfterSurgery || '当天'}` : '',
          r.followUpDate,
          r.symptoms.pain ? '是' : '否',
          r.symptoms.swelling ? '是' : '否',
          r.symptoms.bleeding ? '是' : '否',
          r.symptoms.medication ? '是' : '否',
          r.symptoms.other || '',
          r.resultStatus === 'normal' ? '恢复正常' : r.resultStatus === 'need_review' ? '需医生复核' : '预约复诊',
          (r.notes || '').replace(/"/g, '""'),
          r.nurseName,
          r.doctorReviewStatus === 'handled' ? '已处理' : r.doctorReviewStatus === 'rebook_suggested' ? '建议复诊' : r.doctorReviewStatus === 'pending' ? '待复核' : '-'
        ].map(v => `"${v}"`);
      });
      const BOM = '\uFEFF';
      return BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    },

    exportRecordsCsvWithSummary: (filters) => {
      const recordsCsv = get().exportRecordsCsv(filters);
      const summary = get().getSummaryReport('doctor', filters) as SummaryRow[];
      let summaryPart = '\n\n===== 汇总报表 =====\n';
      summaryPart += ['医生', '科室', '治疗项目', '总完成量', '正常恢复', '需复核', '已复核完成', '建议复诊'].join(',') + '\n';
      summary.forEach(row => {
        summaryPart += [
          row.doctorName,
          row.department,
          getTreatmentLabel(row.treatmentType),
          row.totalCompleted,
          row.normal,
          row.needReview,
          row.reviewHandled,
          row.rebookSuggested
        ].map(v => `"${v}"`).join(',') + '\n';
      });
      return recordsCsv + summaryPart;
    },

    getRecordsStats: (filters) => {
      const recs = get().searchRecords(filters);
      const total = recs.length;
      const normal = recs.filter(r => r.resultStatus === 'normal').length;
      const needReview = recs.filter(r => r.resultStatus === 'need_review').length;
      const rebook = recs.filter(r => r.resultStatus === 'rebook').length;
      return {
        total,
        normal,
        needReview,
        rebook,
        normalPct: total > 0 ? Math.round(normal / total * 100) : 0,
        needReviewPct: total > 0 ? Math.round(needReview / total * 100) : 0,
        rebookPct: total > 0 ? Math.round(rebook / total * 100) : 0
      };
    },

    getSummaryReport: (view, filters) => {
      if (view === 'nurse') {
        return get().getNurseSummaryReport(filters);
      }
      const { getDoctorById, plans } = get();
      const recs = get().searchRecords(filters);
      const map = new Map<string, SummaryRow>();

      recs.forEach(record => {
        const plan = plans.find(p => p.id === record.planId);
        if (!plan) return;

        const key = `${plan.doctorId}-${plan.treatmentType}`;
        const doctor = getDoctorById(plan.doctorId);
        if (!doctor) return;

        if (!map.has(key)) {
          map.set(key, {
            doctorId: plan.doctorId,
            doctorName: doctor.name,
            department: doctor.department,
            treatmentType: plan.treatmentType,
            totalCompleted: 0,
            normal: 0,
            needReview: 0,
            reviewHandled: 0,
            rebookSuggested: 0
          });
        }

        const row = map.get(key)!;
        row.totalCompleted++;
        if (record.resultStatus === 'normal') row.normal++;
        if (record.resultStatus === 'need_review') row.needReview++;
        if (record.doctorReviewStatus === 'handled') row.reviewHandled++;
        if (record.doctorReviewStatus === 'rebook_suggested') row.rebookSuggested++;
      });

      return Array.from(map.values()).sort((a, b) => {
        if (a.doctorId !== b.doctorId) return a.doctorName.localeCompare(b.doctorName);
        return a.treatmentType.localeCompare(b.treatmentType);
      });
    },

    getNurseSummaryReport: (filters) => {
      const recs = get().searchRecords(filters);
      const map = new Map<string, NurseSummaryRow>();

      recs.forEach(record => {
        const nurseName = record.nurseName || '未知';
        if (!map.has(nurseName)) {
          map.set(nurseName, {
            nurseName,
            totalCompleted: 0,
            normal: 0,
            needReview: 0,
            rebook: 0,
            delayedCount: 0
          });
        }
        const row = map.get(nurseName)!;
        row.totalCompleted++;
        if (record.resultStatus === 'normal') row.normal++;
        if (record.resultStatus === 'need_review') row.needReview++;
        if (record.resultStatus === 'rebook') row.rebook++;
      });

      return Array.from(map.values()).sort((a, b) => b.totalCompleted - a.totalCompleted);
    },

    exportRecordsCsvWithViewSummary: (view, filters) => {
      const recordsCsv = get().exportRecordsCsv(filters);
      let summaryPart = '\n\n===== 汇总报表 (';
      summaryPart += view === 'doctor' ? '按医生统计' : '按护士统计';
      summaryPart += ') =====\n';

      if (view === 'doctor') {
        const summary = get().getSummaryReport('doctor', filters) as SummaryRow[];
        summaryPart += ['医生', '科室', '治疗项目', '总完成量', '正常恢复', '需复核', '已复核完成', '建议复诊'].join(',') + '\n';
        summary.forEach(row => {
          summaryPart += [
            row.doctorName,
            row.department,
            getTreatmentLabel(row.treatmentType),
            row.totalCompleted,
            row.normal,
            row.needReview,
            row.reviewHandled,
            row.rebookSuggested
          ].map(v => `"${v}"`).join(',') + '\n';
        });
      } else {
        const summary = get().getNurseSummaryReport(filters);
        summaryPart += ['护士', '总完成量', '正常恢复', '需复核', '预约复诊'].join(',') + '\n';
        summary.forEach(row => {
          summaryPart += [
            row.nurseName,
            row.totalCompleted,
            row.normal,
            row.needReview,
            row.rebook
          ].map(v => `"${v}"`).join(',') + '\n';
        });
      }

      return recordsCsv + summaryPart;
    }
  };
});

export { daysBetween };
