import { useState, useMemo, useCallback } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, AlertCircle, User,
  Phone, Search, Filter, Stethoscope, FileText, AlertTriangle,
  ChevronRight, X, CalendarRange, Download, BarChart3
} from 'lucide-react';
import { cn, getTodayStr, formatDate, getTreatmentLabel, getDayStageLabel, getGenderLabel } from '@/utils/helpers';
import { useAppStore } from '@/store/useAppStore';
import type { FollowUpRecord, FollowUpPlan, ResultStatus } from '@/types';
import StatsCard from '@/components/StatsCard';
import Drawer from '@/components/Drawer';
import Timeline from '@/components/Timeline';

const resultColors: Record<ResultStatus, string> = {
  normal: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  need_review: 'bg-amber-50 text-amber-700 border-amber-100',
  rebook: 'bg-blue-50 text-blue-700 border-blue-100'
};
const resultLabels: Record<ResultStatus, string> = { normal: '恢复正常', need_review: '需医生复核', rebook: '预约复诊' };
const treatmentColors: Record<string, string> = { implant: 'bg-purple-50 text-purple-700 border-purple-100', extraction: 'bg-orange-50 text-orange-700 border-orange-100', root_canal: 'bg-cyan-50 text-cyan-700 border-cyan-100' };

export default function Records() {
  const records = useAppStore(s => s.records);
  const plans = useAppStore(s => s.plans);
  const doctors = useAppStore(s => s.doctors);
  const getPatientById = useAppStore(s => s.getPatientById);
  const getDoctorById = useAppStore(s => s.getDoctorById);
  const getRecordsByPatientId = useAppStore(s => s.getRecordsByPatientId);
  const getPlansByPatientId = useAppStore(s => s.getPlansByPatientId);
  const searchRecords = useAppStore(s => s.searchRecords);
  const exportRecordsCsv = useAppStore(s => s.exportRecordsCsv);
  const getRecordsStats = useAppStore(s => s.getRecordsStats);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterTreatment, setFilterTreatment] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterDoctor, setFilterDoctor] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<FollowUpRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filterParams = { startDate: startDate || undefined, endDate: endDate || undefined, keyword: searchKeyword, treatmentType: filterTreatment, resultStatus: filterResult, doctorId: filterDoctor };

  const stats = useMemo(() => {
    const today = getTodayStr();
    const monthStart = today.slice(0, 7);
    const thisMonthRecords = records.filter(r => r.followUpDate.startsWith(monthStart));
    return { total: records.length, thisMonth: thisMonthRecords.length, needReview: thisMonthRecords.filter(r => r.resultStatus === 'need_review').length, rebook: thisMonthRecords.filter(r => r.resultStatus === 'rebook').length };
  }, [records]);

  const resultStats = useMemo(() => getRecordsStats(filterParams), [filterParams, getRecordsStats, records]);
  const displayedRecords = useMemo(() => searchRecords(filterParams), [searchRecords, filterParams, records]);

  const openDrawer = (record: FollowUpRecord) => { setSelectedRecord(record); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setTimeout(() => setSelectedRecord(null), 300); };

  const handleExport = () => {
    const csv = exportRecordsCsv(filterParams);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `回访记录_${getTodayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const patient = selectedRecord ? getPatientById(selectedRecord.patientId) : null;
  const plan = selectedRecord ? plans.find(p => p.id === selectedRecord.planId) : null;
  const doctor = plan ? getDoctorById(plan.doctorId) : null;
  const patientAllRecords = patient ? getRecordsByPatientId(patient.id) : [];
  const patientAllPlans = patient ? getPlansByPatientId(patient.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="w-7 h-7 text-blue-600" />回访记录</h1>
          <p className="mt-1 text-sm text-slate-500">查看所有历史回访记录，支持多条件筛选查询</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatsCard label="累计回访记录" value={stats.total} icon={<FileText className="w-5 h-5" />} color="blue" />
        <StatsCard label="本月回访" value={stats.thisMonth} icon={<CalendarRange className="w-5 h-5" />} color="green" />
        <StatsCard label="需医生复核" value={stats.needReview} icon={<AlertTriangle className="w-5 h-5" />} color="yellow" />
        <StatsCard label="预约复诊" value={stats.rebook} icon={<CalendarDays className="w-5 h-5" />} color="red" />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600" />当前筛选结果统计</h3>
        {resultStats.total > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600 w-20">恢复正常</span>
              <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-2" style={{ width: `${resultStats.normalPct}%` }}>
                  {resultStats.normalPct >= 15 && <span className="text-xs font-bold text-white">{resultStats.normalPct}%</span>}
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-700 w-16 text-right">{resultStats.normal}条</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600 w-20">需医生复核</span>
              <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-2" style={{ width: `${resultStats.needReviewPct}%` }}>
                  {resultStats.needReviewPct >= 15 && <span className="text-xs font-bold text-white">{resultStats.needReviewPct}%</span>}
                </div>
              </div>
              <span className="text-sm font-bold text-amber-700 w-16 text-right">{resultStats.needReview}条</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600 w-20">预约复诊</span>
              <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-2" style={{ width: `${resultStats.rebookPct}%` }}>
                  {resultStats.rebookPct >= 15 && <span className="text-xs font-bold text-white">{resultStats.rebookPct}%</span>}
                </div>
              </div>
              <span className="text-sm font-bold text-blue-700 w-16 text-right">{resultStats.rebook}条</span>
            </div>
            <p className="text-xs text-slate-400 pt-1">共 {resultStats.total} 条记录</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">暂无数据</p>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">日期：</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            <span className="text-slate-400">至</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="搜索患者姓名或电话..." className="w-full pl-11 pr-4 h-10 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-slate-400" />
            <select value={filterTreatment} onChange={(e) => setFilterTreatment(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="all">全部治疗类型</option>
              <option value="implant">种植牙</option>
              <option value="extraction">拔牙</option>
              <option value="root_canal">根管治疗</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <select value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="all">全部医生</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name} · {d.department}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="all">全部回访结果</option>
              <option value="normal">恢复正常</option>
              <option value="need_review">需医生复核</option>
              <option value="rebook">预约复诊</option>
            </select>
          </div>
          <button onClick={() => { setStartDate(''); setEndDate(''); setSearchKeyword(''); setFilterTreatment('all'); setFilterResult('all'); setFilterDoctor('all'); }} className="h-10 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"><X className="w-3.5 h-3.5" />重置</button>
          <button onClick={handleExport} className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"><Download className="w-4 h-4" />导出 CSV</button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">患者信息</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">治疗项目</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">回访阶段</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">回访日期</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">症状</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">结果</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">复核</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作护士</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRecords.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-20 text-center"><div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center"><FileText className="w-8 h-8 text-slate-400" /></div><p className="mt-4 text-sm font-medium text-slate-600">暂无回访记录</p></td></tr>
              ) : (
                displayedRecords.map((record, idx) => {
                  const p = getPatientById(record.patientId);
                  const pl = plans.find(pp => pp.id === record.planId);
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', p?.gender === 'female' ? 'bg-pink-100' : 'bg-blue-100')}><User className={cn('w-4 h-4', p?.gender === 'female' ? 'text-pink-600' : 'text-blue-600')} /></div><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{p?.name || '未知'}</p><p className="text-xs text-slate-500">{p ? `${getGenderLabel(p.gender)} · ${p.age}岁` : ''}</p></div></div></td>
                      <td className="px-6 py-4">{pl ? <span className={cn('inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border', treatmentColors[pl.treatmentType])}>{getTreatmentLabel(pl.treatmentType)}</span> : <span className="text-xs text-slate-400">-</span>}</td>
                      <td className="px-6 py-4"><span className="text-sm text-slate-700">{pl ? getDayStageLabel(pl.daysAfterSurgery) : '-'}</span></td>
                      <td className="px-6 py-4"><p className="text-sm font-medium text-slate-800">{record.followUpDate}</p></td>
                      <td className="px-6 py-4"><div className="flex flex-wrap gap-1 max-w-[140px]">
                        {record.symptoms.pain && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">疼痛</span>}
                        {record.symptoms.swelling && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">肿胀</span>}
                        {record.symptoms.bleeding && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">出血</span>}
                        {record.symptoms.medication && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">用药</span>}
                        {!record.symptoms.pain && !record.symptoms.swelling && !record.symptoms.bleeding && !record.symptoms.medication && <span className="text-[10px] text-slate-400">无异常</span>}
                      </div></td>
                      <td className="px-6 py-4"><span className={cn('inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border', resultColors[record.resultStatus])}>{resultLabels[record.resultStatus]}</span></td>
                      <td className="px-6 py-4">
                        {record.resultStatus === 'need_review' ? (
                          <span className={cn('text-xs font-medium', record.doctorReviewStatus === 'handled' ? 'text-emerald-600' : record.doctorReviewStatus === 'rebook_suggested' ? 'text-blue-600' : 'text-amber-600')}>
                            {record.doctorReviewStatus === 'handled' ? '已处理' : record.doctorReviewStatus === 'rebook_suggested' ? '建议复诊' : '待复核'}
                          </span>
                        ) : <span className="text-xs text-slate-400">-</span>}
                      </td>
                      <td className="px-6 py-4"><span className="text-sm text-slate-700">{record.nurseName}</span></td>
                      <td className="px-6 py-4 text-right"><button onClick={() => openDrawer(record)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">查看详情<ChevronRight className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">共 <span className="font-semibold text-slate-700">{displayedRecords.length}</span> 条记录</span>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={closeDrawer} title="回访记录详情" width="lg">
        {selectedRecord && patient && (
          <div className="space-y-6 pb-6">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200">
              <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', patient.gender === 'female' ? 'from-pink-100 to-pink-200' : 'from-blue-100 to-blue-200')}><User className={cn('w-7 h-7', patient.gender === 'female' ? 'text-pink-600' : 'text-blue-600')} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><h3 className="text-xl font-bold text-slate-800">{patient.name}</h3><span className={cn('px-2.5 py-0.5 rounded-lg text-xs font-semibold border', resultColors[selectedRecord.resultStatus])}>{resultLabels[selectedRecord.resultStatus]}</span></div>
                <div className="mt-2 flex items-center gap-4 flex-wrap text-sm"><span className="text-slate-600">{getGenderLabel(patient.gender)} · {patient.age}岁</span><a href={`tel:${patient.phone}`} className="flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700"><Phone className="w-3.5 h-3.5" />{patient.phone}</a></div>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />回访日期：{selectedRecord.followUpDate}</span><span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />操作：{selectedRecord.nurseName}</span></div>
                {plan && <div className="mt-2 flex items-center gap-4 text-xs text-slate-500"><span className={cn('px-2 py-0.5 rounded-md border font-medium', treatmentColors[plan.treatmentType])}>{getTreatmentLabel(plan.treatmentType)}</span><span>{getDayStageLabel(plan.daysAfterSurgery)}</span><span>{doctor?.name} 医生</span></div>}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-slate-500" />症状记录</h4>
              <div className="grid grid-cols-2 gap-3">
                {[{key:'pain',label:'疼痛',active:selectedRecord.symptoms.pain,activeBg:'bg-red-50 border-red-200',dotColor:'bg-red-500'},{key:'swelling',label:'肿胀',active:selectedRecord.symptoms.swelling,activeBg:'bg-orange-50 border-orange-200',dotColor:'bg-orange-500'},{key:'bleeding',label:'出血',active:selectedRecord.symptoms.bleeding,activeBg:'bg-rose-50 border-rose-200',dotColor:'bg-rose-500'},{key:'medication',label:'按时用药',active:selectedRecord.symptoms.medication,activeBg:'bg-emerald-50 border-emerald-200',dotColor:'bg-emerald-500'}].map(s=>(
                  <div key={s.key} className={cn('p-4 rounded-xl border', s.active ? s.activeBg : 'bg-slate-50 border-slate-200')}><div className="flex items-center gap-2 mb-1"><span className={cn('w-2 h-2 rounded-full', s.active ? s.dotColor : 'bg-slate-300')} /><span className="text-sm font-semibold text-slate-700">{s.label}</span></div><span className="text-xs text-slate-500">{s.active ? '有' : '无'}</span></div>
                ))}
              </div>
              {selectedRecord.symptoms.other && <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200"><span className="text-xs font-semibold text-slate-600">其他说明</span><p className="text-sm text-slate-700 mt-1">{selectedRecord.symptoms.other}</p></div>}
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 to-slate-50 border border-blue-100"><h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" />沟通备注</h4><p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{selectedRecord.notes || '无备注内容'}</p></div>
            {selectedRecord.resultStatus === 'need_review' && (
              <div className="space-y-3">
                {selectedRecord.doctorQuestion && <div className="p-4 rounded-xl bg-amber-50 border border-amber-200"><h4 className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />护士提问</h4><p className="text-sm text-amber-900">{selectedRecord.doctorQuestion}</p></div>}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200"><h4 className="text-sm font-semibold text-slate-800 mb-2">医生复核状态</h4>
                  {selectedRecord.doctorReviewStatus === 'pending' ? <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium">待复核</span> :
                    <div><span className={cn('px-3 py-1 rounded-lg text-sm font-medium', selectedRecord.doctorReviewStatus === 'handled' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>{selectedRecord.doctorReviewStatus === 'handled' ? '已处理' : '建议复诊'}</span>{selectedRecord.doctorReviewNote && <p className="mt-2 text-sm text-slate-600">{selectedRecord.doctorReviewNote}</p>}{selectedRecord.doctorReviewDate && <p className="mt-1 text-xs text-slate-400">复核日期：{selectedRecord.doctorReviewDate}</p>}</div>
                  }
                </div>
              </div>
            )}
            {patientAllRecords.length > 1 && <div><h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" />该患者历史回访 <span className="text-xs font-normal text-slate-400">（{patientAllRecords.length}条）</span></h4><div className="space-y-2 max-h-60 overflow-y-auto">{patientAllRecords.filter(r => r.id !== selectedRecord.id).map(r => {const rp = plans.find(p => p.id === r.planId); return (<div key={r.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100"><div className="flex items-center justify-between mb-1.5"><span className="text-xs font-medium text-slate-600">{r.followUpDate}</span><span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold border', resultColors[r.resultStatus])}>{resultLabels[r.resultStatus]}</span></div>{r.notes && <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{r.notes}</p>}</div>);})}</div></div>}
            {patientAllPlans.length > 0 && <div><h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-500" />全部回访计划</h4><Timeline plans={patientAllPlans} highlightToday /></div>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
