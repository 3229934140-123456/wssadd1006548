import { User, Phone, MapPin, X } from 'lucide-react';
import { cn, getTreatmentShortLabel, getDayStageLabel, getPriorityLabel, getGenderLabel } from '@/utils/helpers';
import type { FollowUpPlan, Patient } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface PatientCardProps {
  plan: FollowUpPlan;
  onClick?: () => void;
  compact?: boolean;
}

const priorityStyles = {
  high: {
    bar: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-100',
    ring: 'hover:border-red-200'
  },
  medium: {
    bar: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
    ring: 'hover:border-amber-200'
  },
  low: {
    bar: 'bg-slate-400',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    ring: 'hover:border-slate-200'
  }
};

const treatmentColors = {
  implant: 'bg-purple-50 text-purple-700 border-purple-100',
  extraction: 'bg-orange-50 text-orange-700 border-orange-100',
  root_canal: 'bg-cyan-50 text-cyan-700 border-cyan-100'
};

const statusStyles = {
  pending: 'bg-blue-50 text-blue-700 border-blue-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  delayed: 'bg-violet-50 text-violet-700 border-violet-100',
  missed: 'bg-slate-50 text-slate-700 border-slate-200'
};

const statusLabelMap: Record<string, string> = {
  pending: '待回访',
  completed: '已完成',
  delayed: '已延后',
  missed: '未接听'
};

export default function PatientCard({ plan, onClick, compact = false }: PatientCardProps) {
  const patient = useAppStore(s => s.getPatientById(plan.patientId));
  const doctor = useAppStore(s => s.getDoctorById(plan.doctorId));
  const pStyle = priorityStyles[plan.priority];

  if (!patient) return null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl bg-white border border-slate-200 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        pStyle.ring
      )}
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', pStyle.bar)} />
      <div className={cn('flex items-center gap-4', compact ? 'p-3 pl-5' : 'p-4 pl-5')}>
        <div className="flex-shrink-0">
          <div className={cn(
            'rounded-full bg-gradient-to-br flex items-center justify-center',
            patient.gender === 'female'
              ? 'from-pink-100 to-pink-200'
              : 'from-blue-100 to-blue-200',
            compact ? 'w-10 h-10' : 'w-12 h-12'
          )}>
            <User className={cn('text-slate-600', compact ? 'w-5 h-5' : 'w-6 h-6')} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn('font-semibold text-slate-800 truncate', compact ? 'text-sm' : 'text-base')}>
              {patient.name}
            </h3>
            <span className={cn(
              'px-1.5 py-0.5 rounded-md text-xs font-medium border',
              treatmentColors[plan.treatmentType]
            )}>
              {getTreatmentShortLabel(plan.treatmentType)}
            </span>
            <span className={cn(
              'px-2 py-0.5 rounded-md text-xs font-medium border',
              pStyle.badge
            )}>
              {getPriorityLabel(plan.priority)}
            </span>
            {plan.status !== 'pending' && (
              <span className={cn(
                'px-2 py-0.5 rounded-md text-xs font-medium border',
                statusStyles[plan.status]
              )}>
                {statusLabelMap[plan.status]}
                {plan.delayedTimes ? ` ×${plan.delayedTimes}` : ''}
              </span>
            )}
          </div>

          <div className={cn(
            'flex items-center gap-4 mt-1.5 text-slate-600',
            compact ? 'text-xs' : 'text-sm'
          )}>
            <span className="font-medium text-blue-600">{getDayStageLabel(plan.daysAfterSurgery)}</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Phone className="w-3.5 h-3.5" />
              {patient.phone}
            </span>
            {!compact && (
              <span className="flex items-center gap-1 text-slate-500">
                <MapPin className="w-3.5 h-3.5" />
                {doctor?.name} 医生
              </span>
            )}
            {!compact && (
              <span className="text-slate-400">
                {getGenderLabel(patient.gender)} · {patient.age}岁
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center">
          <button
            className="text-slate-400 group-hover:text-blue-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          >
            <X className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
