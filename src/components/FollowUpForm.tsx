import { useState } from 'react';
import { CheckCircle2, AlertTriangle, CalendarCheck, Clock, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/utils/helpers';
import type { Symptoms, ResultStatus, FollowUpPlan } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface FollowUpFormProps {
  plan: FollowUpPlan;
  onSubmit?: () => void;
  onDelay?: (type: '2h' | '4h' | 'tomorrow') => void;
}

const symptomOptions = [
  { key: 'pain', label: '疼痛', icon: AlertCircle, color: 'text-red-600' },
  { key: 'swelling', label: '肿胀', icon: AlertTriangle, color: 'text-orange-600' },
  { key: 'bleeding', label: '出血', icon: AlertTriangle, color: 'text-rose-600' },
  { key: 'medication', label: '按时用药', icon: CheckCircle2, color: 'text-emerald-600' }
] as const;

const resultOptions: { value: ResultStatus; label: string; desc: string; icon: any; color: string; bg: string; border: string }[] = [
  { value: 'normal', label: '恢复正常', desc: '患者恢复良好，无异常', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'need_review', label: '需医生复核', desc: '症状异常，需医生跟进', icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'rebook', label: '预约复诊', desc: '需要安排回院检查', icon: CalendarCheck, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' }
];

export default function FollowUpForm({ plan, onSubmit, onDelay }: FollowUpFormProps) {
  const completeFollowUp = useAppStore(s => s.completeFollowUp);
  const delayFollowUp = useAppStore(s => s.delayFollowUp);

  const [symptoms, setSymptoms] = useState<Symptoms>({
    pain: false, swelling: false, bleeding: false, medication: true, other: ''
  });
  const [resultStatus, setResultStatus] = useState<ResultStatus>('normal');
  const [notes, setNotes] = useState('');
  const [doctorQuestion, setDoctorQuestion] = useState('');
  const [showDelayMenu, setShowDelayMenu] = useState(false);

  const toggleSymptom = (key: keyof Omit<Symptoms, 'other'>) => {
    setSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = () => {
    completeFollowUp({
      planId: plan.id,
      symptoms,
      resultStatus,
      notes,
      contactSuccess: true,
      doctorQuestion: resultStatus === 'need_review' ? doctorQuestion : undefined
    });
    onSubmit?.();
  };

  const handleDelay = (type: '2h' | '4h' | 'tomorrow') => {
    delayFollowUp(plan.id, type);
    setShowDelayMenu(false);
    onDelay?.(type);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-blue-600" />
          症状勾选
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {symptomOptions.map(opt => {
            const active = symptoms[opt.key as keyof Symptoms] as boolean;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleSymptom(opt.key)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left',
                  active
                    ? `${opt.color.replace('text-', 'border-')}200 bg-slate-50 ${opt.color.replace('text-', 'bg-').replace('-600', '-50')} border-2`
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  active ? opt.color.replace('text-', 'bg-').replace('-600', '-100') : 'bg-slate-100'
                )}>
                  <opt.icon className={cn('w-4 h-4', active ? opt.color : 'text-slate-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', active ? opt.color : 'text-slate-700')}>{opt.label}</p>
                </div>
                {active && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <textarea
          value={symptoms.other}
          onChange={(e) => setSymptoms(prev => ({ ...prev, other: e.target.value }))}
          placeholder="其他症状说明（可选）..."
          className="mt-3 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          rows={2}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-blue-600" />
          回访结果
        </h3>
        <div className="space-y-2.5">
          {resultOptions.map(opt => {
            const active = resultStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setResultStatus(opt.value)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
                  active ? `${opt.border} ${opt.bg}` : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  active ? opt.color.replace('text-', 'bg-').replace('-700', '-100') : 'bg-slate-100'
                )}>
                  <opt.icon className={cn('w-5 h-5', active ? opt.color : 'text-slate-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', active ? opt.color : 'text-slate-800')}>{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  active ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                )}>
                  {active && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {resultStatus === 'need_review' && (
        <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 animate-[fadeInUp_0.3s_ease]">
          <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            给医生的问题摘要
          </h3>
          <p className="text-xs text-amber-700 mb-2">请简要描述需要医生关注的问题，方便医生快速了解情况</p>
          <textarea
            value={doctorQuestion}
            onChange={(e) => setDoctorQuestion(e.target.value)}
            placeholder="例如：患者术后3天仍持续疼痛，止痛药效果不佳，请医生评估是否需要调整用药方案..."
            className="w-full px-4 py-3 rounded-xl border border-amber-200 text-sm text-slate-700 placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
            rows={3}
          />
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-blue-600" />
          沟通备注
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="请记录与患者的沟通内容，如症状描述、患者反馈等..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          rows={4}
        />
      </div>

      <div className="pt-2 flex gap-3">
        <div className="relative flex-1">
          <button
            onClick={() => setShowDelayMenu(!showDelayMenu)}
            className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 text-slate-700 font-medium hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            未接听，稍后提醒
            {plan.delayedTimes ? <span className="text-xs text-slate-400">（已延{plan.delayedTimes}次）</span> : null}
          </button>
          {showDelayMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-[fadeIn_0.15s_ease]">
              {[
                { type: '2h' as const, label: '延后 2 小时', desc: '2小时后重新提醒' },
                { type: '4h' as const, label: '延后 4 小时', desc: '4小时后重新提醒' },
                { type: 'tomorrow' as const, label: '明天再打', desc: '明天出现在待回访列表' }
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => handleDelay(opt.type)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                >
                  <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                  <span className="text-xs text-slate-400 ml-2">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleSubmit}
          className="flex-1 h-11 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md shadow-blue-200 hover:shadow-lg flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          提交回访记录
        </button>
      </div>
    </div>
  );
}
