import { useState, useMemo } from 'react';
import {
  Stethoscope, User, AlertTriangle, CheckCircle2, CalendarCheck,
  Phone, Clock, FileText, MessageSquare
} from 'lucide-react';
import { cn, getTreatmentLabel, getDayStageLabel, getGenderLabel, formatDate } from '@/utils/helpers';
import { useAppStore } from '@/store/useAppStore';
import type { FollowUpRecord, DoctorReviewStatus } from '@/types';
import StatsCard from '@/components/StatsCard';

export default function DoctorReview() {
  const records = useAppStore(s => s.records);
  const plans = useAppStore(s => s.plans);
  const getPatientById = useAppStore(s => s.getPatientById);
  const getDoctorById = useAppStore(s => s.getDoctorById);
  const getPendingReviewRecords = useAppStore(s => s.getPendingReviewRecords);
  const reviewByDoctor = useAppStore(s => s.reviewByDoctor);

  const [selectedRecord, setSelectedRecord] = useState<FollowUpRecord | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewStatus, setReviewStatus] = useState<DoctorReviewStatus>('handled');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const pendingRecords = getPendingReviewRecords();
  const allReviewRecords = useMemo(() =>
    records.filter(r => r.resultStatus === 'need_review').sort((a, b) => b.followUpDate.localeCompare(a.followUpDate)),
    [records]
  );
  const handledCount = allReviewRecords.filter(r => r.doctorReviewStatus === 'handled').length;
  const rebookCount = allReviewRecords.filter(r => r.doctorReviewStatus === 'rebook_suggested').length;

  const openReview = (record: FollowUpRecord) => {
    setSelectedRecord(record);
    setReviewNote('');
    setReviewStatus('handled');
    setShowReviewForm(true);
  };

  const handleSubmitReview = () => {
    if (!selectedRecord) return;
    reviewByDoctor(selectedRecord.id, { reviewStatus, reviewNote });
    setShowReviewForm(false);
    setTimeout(() => setSelectedRecord(null), 300);
  };

  const patient = selectedRecord ? getPatientById(selectedRecord.patientId) : null;
  const plan = selectedRecord ? plans.find(p => p.id === selectedRecord.planId) : null;
  const doctor = plan ? getDoctorById(plan.doctorId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Stethoscope className="w-7 h-7 text-blue-600" />
          医生复核
        </h1>
        <p className="mt-1 text-sm text-slate-500">查看需复核的回访记录，标记处理状态</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatsCard label="待复核" value={pendingRecords.length} icon={<AlertTriangle className="w-5 h-5" />} color="red" />
        <StatsCard label="已处理" value={handledCount} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
        <StatsCard label="建议复诊" value={rebookCount} icon={<CalendarCheck className="w-5 h-5" />} color="blue" />
      </div>

      {pendingRecords.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 py-20 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="w-10 h-10 text-emerald-400" /></div>
          <h3 className="mt-5 text-lg font-semibold text-slate-800">暂无待复核记录</h3>
          <p className="mt-1 text-sm text-slate-500">所有需复核的回访记录已处理完毕</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRecords.map(record => {
            const p = getPatientById(record.patientId);
            const pl = plans.find(pp => pp.id === record.planId);
            const dr = pl ? getDoctorById(pl.doctorId) : null;
            return (
              <div key={record.id} className="rounded-2xl bg-white border-2 border-amber-200 overflow-hidden hover:shadow-md transition-all">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', p?.gender === 'female' ? 'from-pink-100 to-pink-200' : 'from-blue-100 to-blue-200')}>
                      <User className={cn('w-7 h-7', p?.gender === 'female' ? 'text-pink-600' : 'text-blue-600')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-800">{p?.name || '未知'}</h3>
                        {pl && <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium border', pl.treatmentType === 'implant' ? 'bg-purple-50 text-purple-700 border-purple-100' : pl.treatmentType === 'extraction' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-cyan-50 text-cyan-700 border-cyan-100')}>{getTreatmentLabel(pl.treatmentType)}</span>}
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">待复核</span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                        {p && <span>{getGenderLabel(p.gender)} · {p.age}岁</span>}
                        {pl && <span>{getDayStageLabel(pl.daysAfterSurgery)}</span>}
                        {dr && <span>{dr.name} 医生</span>}
                        <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3.5 h-3.5" />{record.followUpDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {record.symptoms.pain && <span className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-700 font-medium">疼痛</span>}
                      {record.symptoms.swelling && <span className="text-xs px-2 py-1 rounded-lg bg-orange-100 text-orange-700 font-medium">肿胀</span>}
                      {record.symptoms.bleeding && <span className="text-xs px-2 py-1 rounded-lg bg-rose-100 text-rose-700 font-medium">出血</span>}
                      {record.symptoms.medication && <span className="text-xs px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium">按时用药</span>}
                    </div>
                  </div>

                  {record.notes && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-1">护士备注</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{record.notes}</p>
                    </div>
                  )}

                  {record.doctorQuestion && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />护士提问</p>
                      <p className="text-sm text-amber-900 leading-relaxed font-medium">{record.doctorQuestion}</p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button onClick={() => openReview(record)} className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md shadow-blue-200 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      处理复核
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {allReviewRecords.filter(r => r.doctorReviewStatus !== 'pending').length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">已处理记录</h2>
          <div className="space-y-3">
            {allReviewRecords.filter(r => r.doctorReviewStatus !== 'pending').map(record => {
              const p = getPatientById(record.patientId);
              return (
                <div key={record.id} className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', p?.gender === 'female' ? 'bg-pink-100' : 'bg-blue-100')}>
                        <User className={cn('w-4 h-4', p?.gender === 'female' ? 'text-pink-600' : 'text-blue-600')} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{p?.name || '未知'}</p>
                        <p className="text-xs text-slate-500">{record.followUpDate} · {record.nurseName}</p>
                      </div>
                    </div>
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold', record.doctorReviewStatus === 'handled' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700')}>
                      {record.doctorReviewStatus === 'handled' ? '已处理' : '建议复诊'}
                    </span>
                  </div>
                  {record.doctorReviewNote && <p className="mt-2 text-sm text-slate-600 pl-12">{record.doctorReviewNote}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showReviewForm && selectedRecord && patient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowReviewForm(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 animate-[fadeInUp_0.3s_ease]">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Stethoscope className="w-5 h-5 text-blue-600" />复核处理</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-sm font-medium text-slate-800">{patient.name} · {getGenderLabel(patient.gender)} · {patient.age}岁</p>
                {selectedRecord.doctorQuestion && (
                  <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 mb-1">护士提问</p>
                    <p className="text-sm text-amber-900">{selectedRecord.doctorQuestion}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-3">处理意见</p>
                <div className="space-y-2">
                  <button onClick={() => setReviewStatus('handled')} className={cn('w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left', reviewStatus === 'handled' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-300')}>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', reviewStatus === 'handled' ? 'bg-emerald-100' : 'bg-slate-100')}><CheckCircle2 className={cn('w-5 h-5', reviewStatus === 'handled' ? 'text-emerald-700' : 'text-slate-500')} /></div>
                    <div><p className={cn('text-sm font-semibold', reviewStatus === 'handled' ? 'text-emerald-700' : 'text-slate-800')}>已处理</p><p className="text-xs text-slate-500">无需进一步处理</p></div>
                  </button>
                  <button onClick={() => setReviewStatus('rebook_suggested')} className={cn('w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left relative', reviewStatus === 'rebook_suggested' ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300')}>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', reviewStatus === 'rebook_suggested' ? 'bg-blue-100' : 'bg-slate-100')}><CalendarCheck className={cn('w-5 h-5', reviewStatus === 'rebook_suggested' ? 'text-blue-700' : 'text-slate-500')} /></div>
                    <div className="flex-1"><p className={cn('text-sm font-semibold', reviewStatus === 'rebook_suggested' ? 'text-blue-700' : 'text-slate-800')}>建议复诊</p><p className="text-xs text-slate-500">需要患者回院检查，将自动生成复诊待办通知护士联系</p></div>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">复核备注</label>
                <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="填写复核意见或处理建议..." className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowReviewForm(false)} className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all">取消</button>
                <button onClick={handleSubmitReview} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" />提交复核</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
