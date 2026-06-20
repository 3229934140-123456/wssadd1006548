import { useState, useMemo } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, AlertCircle, User,
  Phone, Search, Filter, Stethoscope, FileText, AlertTriangle
} from 'lucide-react';
import { cn, getTodayStr, formatDate, getTreatmentLabel, getPriorityLabel, getDayStageLabel, getGenderLabel } from '@/utils/helpers';
import { useAppStore } from '@/store/useAppStore';
import type { FollowUpPlan, Priority, TreatmentType, FollowUpStatus } from '@/types';
import StatsCard from '@/components/StatsCard';
import PatientCard from '@/components/PatientCard';
import Drawer from '@/components/Drawer';
import FollowUpForm from '@/components/FollowUpForm';
import Timeline from '@/components/Timeline';

const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const statusOrder: Record<FollowUpStatus, number> = { pending: 0, delayed: 1, missed: 2, completed: 3 };

export default function TodayList() {
  const getTodayPlans = useAppStore(s => s.getTodayPlans);
  const getPatientById = useAppStore(s => s.getPatientById);
  const getDoctorById = useAppStore(s => s.getDoctorById);
  const getRecordsByPatientId = useAppStore(s => s.getRecordsByPatientId);
  const plans = useAppStore(s => s.plans);

  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterTreatment, setFilterTreatment] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<FollowUpPlan | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const today = getTodayStr();

  const stats = useMemo(() => {
    const todayPlans = getTodayPlans();
    const allTodayPlans = plans.filter(p => p.scheduledDate === today);
    return {
      total: todayPlans.length,
      high: todayPlans.filter(p => p.priority === 'high').length,
      delayed: todayPlans.filter(p => p.status === 'delayed').length,
      completed: allTodayPlans.filter(p => p.status === 'completed').length
    };
  }, [plans, getTodayPlans, today]);

  const displayedPlans = useMemo(() => {
    const result = getTodayPlans().filter(p => {
      if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
      if (filterTreatment !== 'all' && p.treatmentType !== filterTreatment) return false;
      if (searchKeyword) {
        const patient = getPatientById(p.patientId);
        if (!patient) return false;
        const kw = searchKeyword.toLowerCase();
        return patient.name.includes(searchKeyword) || patient.phone.includes(searchKeyword);
      }
      return true;
    });
    return result.sort((a, b) => {
      const sDiff = statusOrder[a.status] - statusOrder[b.status];
      if (sDiff !== 0) return sDiff;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [getTodayPlans, filterPriority, filterTreatment, searchKeyword, getPatientById]);

  const openDrawer = (plan: FollowUpPlan) => {
    setSelectedPlan(plan);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedPlan(null), 300);
  };

  const handleFormSubmit = () => {
    closeDrawer();
  };

  const patient = selectedPlan ? getPatientById(selectedPlan.patientId) : null;
  const doctor = selectedPlan ? getDoctorById(selectedPlan.doctorId) : null;
  const patientHistoryRecords = patient ? getRecordsByPatientId(patient.id) : [];
  const patientAllPlans = patient
    ? plans.filter(p => p.patientId === patient.id).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-blue-600" />
            今日待回访
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(new Date(), 'full')} · 共 <span className="font-semibold text-blue-600">{stats.total}</span> 位患者等待回访
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          label="今日待回访"
          value={stats.total}
          icon={<CalendarDays className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          label="高优先级"
          value={stats.high}
          icon={<AlertCircle className="w-5 h-5" />}
          color="red"
        />
        <StatsCard
          label="已延后"
          value={stats.delayed}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
        />
        <StatsCard
          label="已完成"
          value={stats.completed}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
        />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索患者姓名或电话..."
            className="w-full pl-11 pr-4 h-10 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600 mr-1">优先级：</span>
          {[
            { value: 'all', label: '全部' },
            { value: 'high', label: '高', color: 'red' },
            { value: 'medium', label: '中', color: 'amber' },
            { value: 'low', label: '低', color: 'slate' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterPriority(opt.value)}
              className={cn(
                'px-3 h-9 rounded-lg text-sm font-medium transition-all',
                filterPriority === opt.value
                  ? opt.color === 'red' ? 'bg-red-500 text-white shadow-sm shadow-red-200' :
                    opt.color === 'amber' ? 'bg-amber-500 text-white shadow-sm shadow-amber-200' :
                      opt.color === 'slate' ? 'bg-slate-500 text-white' :
                        'bg-blue-500 text-white shadow-sm shadow-blue-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-slate-400" />
          <select
            value={filterTreatment}
            onChange={(e) => setFilterTreatment(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="all">全部治疗类型</option>
            <option value="implant">种植牙</option>
            <option value="extraction">拔牙</option>
            <option value="root_canal">根管治疗</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {displayedPlans.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 py-20 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-800">暂无待回访患者</h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchKeyword || filterPriority !== 'all' || filterTreatment !== 'all'
                ? '当前筛选条件下没有待回访记录'
                : '今日回访工作已完成，辛苦了！'}
            </p>
          </div>
        ) : (
          displayedPlans.map((plan, idx) => (
            <div
              key={plan.id}
              style={{ animationDelay: `${idx * 40}ms` }}
              className="animate-[fadeInUp_0.4s_ease]"
            >
              <PatientCard plan={plan} onClick={() => openDrawer(plan)} />
            </div>
          ))
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="回访详情"
        width="lg"
      >
        {selectedPlan && patient && (
          <div className="space-y-6 pb-6">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-slate-50 border border-blue-100">
              <div className={cn(
                'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-md',
                patient.gender === 'female' ? 'from-pink-100 to-pink-200' : 'from-blue-100 to-blue-200'
              )}>
                <User className={cn('w-8 h-8', patient.gender === 'female' ? 'text-pink-600' : 'text-blue-600')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-slate-800">{patient.name}</h3>
                  <span className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-medium border',
                    selectedPlan.priority === 'high' && 'bg-red-50 text-red-700 border-red-100',
                    selectedPlan.priority === 'medium' && 'bg-amber-50 text-amber-700 border-amber-100',
                    selectedPlan.priority === 'low' && 'bg-slate-50 text-slate-600 border-slate-200'
                  )}>
                    {getPriorityLabel(selectedPlan.priority)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                    {getTreatmentLabel(selectedPlan.treatmentType)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 flex-wrap text-sm">
                  <span className="text-slate-600">
                    {getGenderLabel(patient.gender)} · {patient.age}岁
                  </span>
                  <a
                    href={`tel:${patient.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {patient.phone}
                  </a>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5" />
                    {doctor?.name} 医生 · {doctor?.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {getDayStageLabel(selectedPlan.daysAfterSurgery)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
                <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  医嘱摘要
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedPlan.instructions}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30">
                <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  禁忌事项
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedPlan.contraindications}
                </p>
              </div>
            </div>

            {patientHistoryRecords.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  历史沟通记录 <span className="text-xs font-normal text-slate-400">({patientHistoryRecords.length})</span>
                </h4>
                <div className="space-y-3">
                  {patientHistoryRecords.slice(0, 3).map(record => (
                    <div key={record.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">{record.followUpDate} · {record.nurseName}</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-md text-xs font-medium',
                          record.resultStatus === 'normal' && 'bg-emerald-100 text-emerald-700',
                          record.resultStatus === 'need_review' && 'bg-amber-100 text-amber-700',
                          record.resultStatus === 'rebook' && 'bg-blue-100 text-blue-700'
                        )}>
                          {record.resultStatus === 'normal' ? '恢复正常' :
                            record.resultStatus === 'need_review' ? '需医生复核' : '预约复诊'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {record.symptoms.pain && <span className="text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-700">疼痛</span>}
                        {record.symptoms.swelling && <span className="text-[11px] px-2 py-0.5 rounded bg-orange-100 text-orange-700">肿胀</span>}
                        {record.symptoms.bleeding && <span className="text-[11px] px-2 py-0.5 rounded bg-rose-100 text-rose-700">出血</span>}
                        {record.symptoms.medication && <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">按时用药</span>}
                      </div>
                      {record.notes && (
                        <p className="text-sm text-slate-600 leading-relaxed">{record.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {patientAllPlans.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  全部回访计划
                </h4>
                <Timeline plans={patientAllPlans} highlightToday />
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                本次回访记录
              </h4>
              <FollowUpForm
                plan={selectedPlan}
                onSubmit={handleFormSubmit}
                onDelay={() => closeDrawer()}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
