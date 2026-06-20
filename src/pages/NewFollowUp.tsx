import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, FileText, UserPlus, Calendar, Stethoscope,
  Sparkles, AlertCircle, CheckCircle2, Plus, X, Check
} from 'lucide-react';
import { cn, getTodayStr, formatDate, addDays, getPriorityLabel } from '@/utils/helpers';
import { TREATMENT_PRESETS, TREATMENT_OPTIONS } from '@/data/presets';
import type { TreatmentType } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import Timeline from '@/components/Timeline';

const genders = [
  { value: 'male' as const, label: '男' },
  { value: 'female' as const, label: '女' }
];

export default function NewFollowUp() {
  const navigate = useNavigate();
  const addPatient = useAppStore(s => s.addPatient);
  const doctors = useAppStore(s => s.doctors);
  const createFollowUpPlans = useAppStore(s => s.createFollowUpPlans);

  const [step, setStep] = useState(1);
  const [patientForm, setPatientForm] = useState<{
    name: string; phone: string; gender: 'male' | 'female'; age: number; medicalRecordNo: string;
  }>({
    name: '', phone: '', gender: 'male', age: 30, medicalRecordNo: ''
  });
  const [treatmentType, setTreatmentType] = useState<TreatmentType | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [surgeryDate, setSurgeryDate] = useState(getTodayStr());
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [instructions, setInstructions] = useState('');
  const [contraindications, setContraindications] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const preset = treatmentType ? TREATMENT_PRESETS[treatmentType] : null;

  const handleTreatmentChange = (type: TreatmentType) => {
    setTreatmentType(type);
    setSelectedDays(TREATMENT_PRESETS[type].defaultDays);
    setInstructions(TREATMENT_PRESETS[type].defaultInstructions);
    setContraindications(TREATMENT_PRESETS[type].defaultContraindications);
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const previewPlans = useMemo(() => {
    if (!treatmentType || selectedDays.length === 0) return [];
    return selectedDays.map(day => {
      const d = addDays(new Date(surgeryDate), day);
      const dateStr = formatDate(d, 'date');
      return {
        id: `preview-${day}`,
        patientId: 'preview',
        treatmentType,
        doctorId: doctorId || 'preview',
        daysAfterSurgery: day,
        scheduledDate: dateStr,
        priority: preset?.priorityMap[day] || 'low',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        instructions,
        contraindications
      };
    });
  }, [treatmentType, selectedDays, surgeryDate, doctorId, preset, instructions, contraindications]);

  const canProceedStep1 = patientForm.name.trim() && patientForm.phone.trim();
  const canProceedStep2 = treatmentType && doctorId && selectedDays.length > 0;

  const handleSubmit = () => {
    const patient = addPatient({ ...patientForm });
    createFollowUpPlans({
      patientId: patient.id,
      treatmentType: treatmentType!,
      doctorId,
      selectedDays,
      surgeryDate,
      instructions,
      contraindications
    });
    setShowSuccess(true);
    setTimeout(() => navigate('/'), 1800);
  };

  if (showSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center animate-[fadeInUp_0.4s_ease]">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-200 animate-[scaleIn_0.4s_ease]">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-800">回访计划已生成</h2>
          <p className="mt-2 text-slate-500">
            已为 <span className="font-semibold text-slate-700">{patientForm.name}</span> 创建 {selectedDays.length} 条回访提醒
          </p>
          <p className="mt-1 text-sm text-slate-400">即将跳转到今日待回访...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <UserPlus className="w-7 h-7 text-blue-600" />
          新增回访计划
        </h1>
        <p className="mt-1 text-sm text-slate-500">录入患者信息，系统自动生成术后回访提醒</p>
      </div>

      <div className="flex items-center gap-4 px-2">
        {[
          { idx: 1, label: '患者信息', ok: step > 1 },
          { idx: 2, label: '治疗与回访设置', ok: step > 2 },
          { idx: 3, label: '确认并创建', ok: false }
        ].map(({ idx, label, ok }) => (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                step >= idx
                  ? (ok ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white shadow-md shadow-blue-200')
                  : 'bg-slate-200 text-slate-500'
              )}>
                {ok ? <Check className="w-4 h-4" /> : idx}
              </div>
              <span className={cn(
                'text-sm font-medium whitespace-nowrap',
                step >= idx ? 'text-slate-800' : 'text-slate-400'
              )}>{label}</span>
            </div>
            {idx < 3 && (
              <div className={cn(
                'flex-1 h-0.5 mx-4 rounded-full transition-colors',
                step > idx ? 'bg-blue-500' : 'bg-slate-200'
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {step === 1 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-5 animate-[fadeInUp_0.3s_ease]">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                基本信息
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">患者姓名 *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={patientForm.name}
                      onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                      placeholder="请输入患者姓名"
                      className="w-full pl-11 pr-4 h-11 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">联系电话 *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                      placeholder="请输入手机号码"
                      className="w-full pl-11 pr-4 h-11 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">性别</label>
                  <div className="flex gap-2">
                    {genders.map(g => (
                      <button
                        key={g.value}
                        onClick={() => setPatientForm({ ...patientForm, gender: g.value })}
                        className={cn(
                          'flex-1 h-11 rounded-xl border-2 text-sm font-medium transition-all',
                          patientForm.gender === g.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        )}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">年龄</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0" max="150"
                      value={patientForm.age}
                      onChange={(e) => setPatientForm({ ...patientForm, age: parseInt(e.target.value) || 0 })}
                      className="flex-1 px-4 h-11 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <span className="ml-3 text-sm text-slate-500">岁</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <FileText className="w-4 h-4 inline mr-1 text-slate-400" />
                    病历号
                  </label>
                  <input
                    value={patientForm.medicalRecordNo}
                    onChange={(e) => setPatientForm({ ...patientForm, medicalRecordNo: e.target.value })}
                    placeholder="选填，如 MR20240012"
                    className="w-full px-4 h-11 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className={cn(
                    'h-11 px-6 rounded-xl font-semibold transition-all flex items-center gap-2',
                    canProceedStep1
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200 hover:shadow-lg hover:from-blue-700 hover:to-blue-800'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  )}
                >
                  下一步
                  <X className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-6 animate-[fadeInUp_0.3s_ease]">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  治疗项目
                </h2>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {TREATMENT_OPTIONS.map(opt => {
                    const active = treatmentType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleTreatmentChange(opt.value)}
                        className={cn(
                          'p-4 rounded-xl border-2 text-left transition-all duration-200',
                          active
                            ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-100'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={cn(
                              'text-base font-semibold',
                              active ? 'text-blue-700' : 'text-slate-800'
                            )}>{opt.label}</p>
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                          </div>
                          {active && (
                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Stethoscope className="w-4 h-4 inline mr-1 text-slate-400" />
                    主治医生 *
                  </label>
                  <select
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full px-4 h-11 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="">请选择医生</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.title} · {d.department}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Calendar className="w-4 h-4 inline mr-1 text-slate-400" />
                    手术/治疗日期
                  </label>
                  <input
                    type="date"
                    value={surgeryDate}
                    onChange={(e) => setSurgeryDate(e.target.value)}
                    className="w-full px-4 h-11 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {preset && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      回访时间节点
                    </h3>
                    <span className="text-xs text-slate-500">
                      已选 {selectedDays.length} / {preset.defaultDays.length} 个节点
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preset.defaultDays.map(day => {
                      const selected = selectedDays.includes(day);
                      const prio = preset.priorityMap[day];
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={cn(
                            'px-3.5 py-2 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-2',
                            selected
                              ? prio === 'high'
                                ? 'border-red-300 bg-red-50 text-red-700'
                                : prio === 'medium'
                                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                                  : 'border-blue-300 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          )}
                        >
                          {selected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          术后第{day === 0 ? '当天' : `${day}天`}
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-md font-semibold',
                            prio === 'high' ? 'bg-red-100 text-red-700' :
                              prio === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                          )}>
                            {getPriorityLabel(prio)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {preset && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-500" />
                      医嘱摘要
                    </label>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      rows={7}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <AlertCircle className="w-4 h-4 inline mr-1 text-amber-500" />
                      禁忌事项
                    </label>
                    <textarea
                      value={contraindications}
                      onChange={(e) => setContraindications(e.target.value)}
                      rows={7}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="h-11 px-6 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  上一步
                </button>
                <button
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                  className={cn(
                    'h-11 px-6 rounded-xl font-semibold transition-all flex items-center gap-2',
                    canProceedStep2
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200 hover:shadow-lg hover:from-blue-700 hover:to-blue-800'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  )}
                >
                  确认创建
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-5 animate-[fadeInUp_0.3s_ease]">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">确认信息</h2>
                  <p className="text-sm text-slate-500">请确认以下内容无误后创建回访计划</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 mb-1">患者信息</p>
                  <p className="text-base font-semibold text-slate-800">
                    {patientForm.name} · {patientForm.gender === 'male' ? '男' : '女'} · {patientForm.age}岁
                  </p>
                  <p className="text-sm text-slate-600 mt-1">{patientForm.phone}</p>
                  {patientForm.medicalRecordNo && (
                    <p className="text-xs text-slate-500 mt-1">病历号：{patientForm.medicalRecordNo}</p>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 mb-1">治疗信息</p>
                  <p className="text-base font-semibold text-slate-800">
                    {TREATMENT_OPTIONS.find(o => o.value === treatmentType)?.label}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {doctors.find(d => d.id === doctorId)?.name} 医生
                  </p>
                  <p className="text-xs text-slate-500 mt-1">治疗日期：{surgeryDate}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800 mb-2">
                  将生成以下 <span className="text-blue-600">{selectedDays.length}</span> 条回访提醒
                </p>
                <div className="flex flex-wrap gap-2">
                  {previewPlans.map(p => (
                    <div
                      key={p.id}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border',
                        p.priority === 'high' && 'bg-red-50 text-red-700 border-red-100',
                        p.priority === 'medium' && 'bg-amber-50 text-amber-700 border-amber-100',
                        p.priority === 'low' && 'bg-blue-50 text-blue-700 border-blue-100'
                      )}
                    >
                      {p.scheduledDate} · 术后第{p.daysAfterSurgery || '当天'}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="h-11 px-6 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  返回修改
                </button>
                <button
                  onClick={handleSubmit}
                  className="h-11 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-200 hover:shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  确认创建回访计划
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl bg-white border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              回访计划预览
            </h3>
            {previewPlans.length > 0 ? (
              <Timeline plans={previewPlans} highlightToday />
            ) : (
              <div className="py-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-slate-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-600">请选择治疗项目</p>
                <p className="mt-1 text-xs text-slate-400">完成设置后此处显示回访时间轴</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
