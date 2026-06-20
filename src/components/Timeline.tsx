import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { cn, formatDate, getTreatmentShortLabel, getPriorityLabel } from '@/utils/helpers';
import type { FollowUpPlan } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface TimelineProps {
  plans: FollowUpPlan[];
  highlightToday?: boolean;
}

const priorityDots = {
  high: 'bg-red-500 ring-red-100',
  medium: 'bg-amber-500 ring-amber-100',
  low: 'bg-slate-400 ring-slate-100'
};

const statusDots = {
  pending: '',
  completed: '!bg-emerald-500 !ring-emerald-100',
  delayed: '!bg-violet-500 !ring-violet-100',
  snoozed: '!bg-indigo-500 !ring-indigo-100',
  missed: '!bg-slate-300'
};

const statusLabels: Record<string, string> = {
  pending: '',
  completed: '已完成',
  delayed: '已延后',
  snoozed: '稍后提醒',
  missed: '已错过'
};

export default function Timeline({ plans, highlightToday = false }: TimelineProps) {
  const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const today = getToday();
  const sortedPlans = [...plans].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  return (
    <div className="relative">
      <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-100 via-blue-50 to-slate-100 rounded-full" />
      <ul className="space-y-4">
        {sortedPlans.map((plan, idx) => {
          const isToday = highlightToday && plan.scheduledDate === today;
          const patient = useAppStore.getState().getPatientById(plan.patientId);
          return (
            <li key={plan.id} className="relative pl-14 animate-[fadeInUp_0.4s_ease]" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className={cn(
                'absolute left-0 top-1 w-11 h-11 rounded-full flex items-center justify-center ring-4',
                priorityDots[plan.priority],
                statusDots[plan.status],
                isToday && 'ring-8 scale-110 transition-transform'
              )}>
                {plan.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : plan.status === 'delayed' ? (
                  <Clock className="w-5 h-5 text-white" />
                ) : plan.status === 'snoozed' ? (
                  <Clock className="w-5 h-5 text-white" />
                ) : (
                  <Calendar className="w-5 h-5 text-white" />
                )}
              </div>
              <div className={cn(
                'p-4 rounded-xl border transition-all duration-200',
                isToday
                  ? 'bg-blue-50/50 border-blue-200 shadow-md shadow-blue-100/50'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              )}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'text-sm font-semibold',
                      isToday ? 'text-blue-700' : 'text-slate-800'
                    )}>
                      {formatDate(plan.scheduledDate, 'date')}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                        今天
                      </span>
                    )}
                    <span className="text-sm text-slate-600 font-medium">
                      术后第{plan.daysAfterSurgery || '当天'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                      {getTreatmentShortLabel(plan.treatmentType)}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-md text-xs font-medium border',
                      plan.priority === 'high' && 'bg-red-50 text-red-700 border-red-100',
                      plan.priority === 'medium' && 'bg-amber-50 text-amber-700 border-amber-100',
                      plan.priority === 'low' && 'bg-slate-50 text-slate-600 border-slate-200'
                    )}>
                      {getPriorityLabel(plan.priority)}
                    </span>
                    {plan.status === 'completed' && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                        已完成
                      </span>
                    )}
                    {plan.status === 'snoozed' && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                        稍后提醒
                      </span>
                    )}
                    {plan.status === 'delayed' && (
                      <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-medium border border-violet-100">
                        已延后
                      </span>
                    )}
                  </div>
                </div>
                {patient && (
                  <p className="mt-2 text-sm text-slate-600">
                    患者：<span className="font-medium text-slate-800">{patient.name}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    {patient.gender === 'male' ? '男' : '女'} {patient.age}岁
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
