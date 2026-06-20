export type TreatmentType = 'implant' | 'extraction' | 'root_canal';

export type Priority = 'high' | 'medium' | 'low';

export type FollowUpStatus = 'pending' | 'completed' | 'delayed' | 'missed';

export type ResultStatus = 'normal' | 'need_review' | 'rebook';

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
}

export interface AppState {
  patients: Patient[];
  doctors: Doctor[];
  plans: FollowUpPlan[];
  records: FollowUpRecord[];
  currentNurse: string;
}
