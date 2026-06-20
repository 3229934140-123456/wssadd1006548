export type TreatmentType = 'implant' | 'extraction' | 'root_canal';

export type Priority = 'high' | 'medium' | 'low';

export type FollowUpStatus = 'pending' | 'completed' | 'delayed' | 'snoozed' | 'missed';

export type ResultStatus = 'normal' | 'need_review' | 'rebook';

export type DoctorReviewStatus = 'pending' | 'handled' | 'rebook_suggested';

export type RebookTaskStatus = 'pending_contact' | 'contacted' | 'confirmed' | 'cancelled';

export interface Patient {
  id: string;
  name: string;
  phone: string;
  gender: 'male' | 'female';
  age: number;
  medicalRecordNo: string;
}

export interface Doctor {
  id: string;
  name: string;
  title: string;
  department: string;
}

export interface FollowUpPlan {
  id: string;
  patientId: string;
  treatmentType: TreatmentType;
  doctorId: string;
  daysAfterSurgery: number;
  scheduledDate: string;
  priority: Priority;
  status: FollowUpStatus;
  createdAt: string;
  instructions: string;
  contraindications: string;
  delayedTimes?: number;
  remindAt?: string;
}

export interface Symptoms {
  pain: boolean;
  swelling: boolean;
  bleeding: boolean;
  medication: boolean;
  other: string;
}

export interface FollowUpRecord {
  id: string;
  planId: string;
  patientId: string;
  symptoms: Symptoms;
  resultStatus: ResultStatus;
  notes: string;
  nurseName: string;
  contactSuccess: boolean;
  followUpDate: string;
  nextFollowUpDate?: string;
  doctorQuestion?: string;
  doctorReviewStatus?: DoctorReviewStatus;
  doctorReviewNote?: string;
  doctorReviewDate?: string;
}

export interface RebookTask {
  id: string;
  recordId: string;
  patientId: string;
  doctorId: string;
  treatmentType: TreatmentType;
  doctorNote: string;
  status: RebookTaskStatus;
  nurseNote?: string;
  contactDate?: string;
  appointmentDate?: string;
  confirmedDate?: string;
  createdAt: string;
  createdBy: string;
}

export type SummaryView = 'doctor' | 'nurse';

export interface NurseSummaryRow {
  nurseName: string;
  totalCompleted: number;
  normal: number;
  needReview: number;
  rebook: number;
  delayedCount: number;
}

export interface AppState {
  patients: Patient[];
  doctors: Doctor[];
  plans: FollowUpPlan[];
  records: FollowUpRecord[];
  rebookTasks: RebookTask[];
  currentNurse: string;
}

export interface SummaryRow {
  doctorId: string;
  doctorName: string;
  department: string;
  treatmentType: TreatmentType;
  totalCompleted: number;
  normal: number;
  needReview: number;
  reviewHandled: number;
  rebookSuggested: number;
}
