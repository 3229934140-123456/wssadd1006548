import { useState, useMemo } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, AlertCircle, User,
  Phone, Search, Filter, Stethoscope, FileText, AlertTriangle,
  ChevronLeft, ChevronRight, PhoneCall, X, MessageSquare,
  ListTodo, BellRing, RefreshCw
} from 'lucide-react';
import { cn, getTodayStr, formatDate, getTreatmentLabel, getPriorityLabel, getDayStageLabel, getGenderLabel, getRebookStatusLabel } from '@/utils/helpers';
import { useAppStore } from '@/store/useAppStore';
import type { FollowUpPlan, Priority, FollowUpStatus, RebookTaskStatus } from '@/types';
import StatsCard from '@/components/StatsCard';
import PatientCard from '@/components/PatientCard';
import Drawer from '@/components/Drawer';
import FollowUpForm from '@/components/FollowUpForm';
import Timeline from '@/components/Timeline';

const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const statusOrder: Record<FollowUpStatus, number> = { pending: 0, delayed: 1, snoozed: 2, missed: 3, completed: 4 };

const rebookStatusStyles: Record<RebookTaskStatus, string> = {
  pending_contact: 'bg-amber-50 text-amber-700 border-amber-100',
  contacted: 'bg-blue-50 text-blue-700 border-blue-100',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-slate-50 text-slate-600 border-slate-200'
};

export default function TodayList() {
  const getPendingPlans = useAppStore(s => s.getPendingPlans);
  const getOverduePlans = useAppStore(s => s.getOverduePlans);
  const getSnoozedPlans = useAppStore(s => s.getSnoozedPlans);
  const getRebookTasks = useAppStore(s => s.getRebookTasks);
  const updateRebookTaskStatus = useAppStore(s => s.updateRebookTaskStatus);
  const delayFollowUp = useAppStore(s => s.delayFollowUp);
  const completeFollowUp = useAppStore(s => s.completeFollowUp);
  const getPatientById = useAppStore(s => s.getPatientById);
  const getDoctorById = useAppStore(s => s.getDoctorById);
  const getRecordsByPatientId = useAppStore(s => s.getRecordsByPatientId);
  const plans = useAppStore(s => s.plans);

  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterTreatment, setFilterTreatment] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<FollowUpPlan | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [contactingRebookId, setContactingRebookId] = useState<string | null>(null);
  const [rebookNote, setRebookNote] = useState('');

  const today = getTodayStr();

  const stats = useMemo(() => {
    const pendingPlans = getPendingPlans();
    const overduePlans = getOverduePlans();
    const snoozedPlans = getSnoozedPlans();
    const rebookTasks = getRebookTasks({ status: 'pending_contact' });
    const allTodayPlans = plans.filter(p => p.scheduledDate <= today);
    return {
      total: pendingPlans.length,
      high: pendingPlans.filter(p => p.priority === 'high').length,
      overdue: overduePlans.length,
      snoozed: snoozedPlans.length,
      rebook: rebookTasks.length,
      completed: allTodayPlans.filter(p => p.status === 'completed').length
    };
  }, [plans, getPendingPlans, getOverduePlans, getSnoozedPlans, getRebookTasks, today]);

  const displayedPendingPlans = useMemo(() => {
    const result = getPendingPlans().filter(p => {
      if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
      if (filterTreatment !== 'all' && p.treatmentType !== filterTreatment) return false;
      if (searchKeyword) {
        const patient = getPatientById(p.patientId);
        if (!patient) return false;
        return patient.name.includes(searchKeyword) || patient.phone.includes(searchKeyword);
      }
      return true;
    });
    return result.sort((a, b) => {
      const isOverdueA = a.scheduledDate < today ? 0 : 1;
      const isOverdueB = b.scheduledDate < today ? 0 : 1;
      if (isOverdueA !== isOverdueB) return isOverdueA - isOverdueB;
      const sDiff = statusOrder[a.status] - statusOrder[b.status];
      if (sDiff !== 0) return sDiff;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [getPendingPlans, filterPriority, filterTreatment, searchKeyword, getPatientById, today]);

  const rebookTasks = useMemo(() => {
    return getRebookTasks().filter(t => t.status === 'pending_contact' || t.status === 'contacted');
  }, [getRebookTasks]);

  const snoozedPlans = useMemo(() => {
    return getSnoozedPlans();
  }, [getSnoozedPlans]);

  const batchSortedPlans = useMemo(() => {
    return [...displayedPendingPlans].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [displayedPendingPlans]);

  const currentBatchPatient = batchSortedPlans[batchIndex] || null;
  const currentBatchPatientData = currentBatchPatient ? getPatientById(currentBatchPatient.patientId) : null;

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

  const handleRebookContact = (taskId: string) => {
    setContactingRebookId(taskId);
    setRebookNote('');
  };

  const handleRebookContactSubmit = (taskId: string) => {
    updateRebookTaskStatus(taskId, {
      status: 'contacted',
      nurseNote: rebookNote
    });
    setContactingRebookId(null);
    setRebookNote('');
  };

  const handleBatchMissedCall = () => {
    if (currentBatchPatient) {
      delayFollowUp(currentBatchPatient.id, '2h');
      if (batchIndex < batchSortedPlans.length - 1) {
        setBatchIndex(prev => prev + 1);
      }
    }
  };

  const handleBatchNormal = () => {
    if (currentBatchPatient) {
      completeFollowUp({
        planId: currentBatchPatient.id,
        symptoms: { pain: false, swelling: false, bleeding: false, medication: true, other: '' },
        resultStatus: 'normal',
        notes: '批量拨打 - 患者恢复正常',
        contactSuccess: true
      });
      if (batchIndex < batchSortedPlans.length - 1) {
        setBatchIndex(prev => prev + 1);
      }
    }
  };

  const handleBatchNeedReview = () => {
    if (currentBatchPatient) {
      completeFollowUp({
        planId: currentBatchPatient.id,
        symptoms: { pain: false, swelling: false, bleeding: false, medication: false, other: '' },
        resultStatus: 'need_review',
        notes: '批量拨打 - 需医生复核',
        contactSuccess: true,
        doctorQuestion: '批量拨打标记需复核'
      });
      if (batchIndex < batchSortedPlans.length - 1) {
        setBatchIndex(prev => prev + 1);
      }
    }
  };

  const handlePrevPatient = () => {
    setBatchIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextPatient = () => {
    setBatchIndex(prev => Math.min(batchSortedPlans.length - 1, prev + 1));
  };

  const patient = selectedPlan ? getPatientById(selectedPlan.patientId) : null;
  const doctor = selectedPlan ? getDoctorById(selectedPlan.doctorId) : null;
  const patientHistoryRecords = patient ? getRecordsByPatientId(patient.id) : [];
  const patientAllPlans = patient
    ? plans.filter(p => p.patientId === patient.id).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    : [];

  return (
    <div className={cn('space-y-6', batchMode && 'pb-48')}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-blue-600" />
            今日待回访
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(new Date(), 'full')} · 共 <span className="font-semibold text-blue-600">{stats.total}</span> 位患者待处理
            {stats.overdue > 0 && <span className="text-red-600 font-semibold">（含 {stats.overdue} 条逾期）</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <StatsCard label="待处理" value={stats.total} icon={<CalendarDays className="w-5 h-5" />} color="blue" />
        <StatsCard label="高优先级" value={stats.high} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        <StatsCard label="逾期" value={stats.overdue} icon={<AlertTriangle className="w-5 h-5" />} color="red" />
        <StatsCard label="稍后提醒" value={stats.snoozed} icon={<Clock className="w-5 h-5" />} color="yellow" />
        <StatsCard label="复诊待办" value={stats.rebook} icon={<ListTodo className="w-5 h-5" />} color="blue" />
        <StatsCard label="已完成" value={stats.completed} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="搜索患者姓名或电话..." className="w-full pl-11 pr-4 h-10 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
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
            <button key={opt.value} onClick={() => setFilterPriority(opt.value)} className={cn(
              'px-3 h-9 rounded-lg text-sm font-medium transition-all',
              filterPriority === opt.value
                ? opt.color === 'red' ? 'bg-red-500 text-white shadow-sm shadow-red-200' :
                  opt.color === 'amber' ? 'bg-amber-500 text-white shadow-sm shadow-amber-200' :
                    opt.color === 'slate' ? 'bg-slate-500 text-white' : 'bg-blue-500 text-white shadow-sm shadow-blue-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}>{opt.label}</button>
          ))}
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-slate-400" />
          <select value={filterTreatment} onChange={(e) => setFilterTreatment(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
            <option value="all">全部治疗类型</option>
            <option value="implant">种植牙</option>
            <option value="extraction">拔牙</option>
            <option value="root_canal">根管治疗</option>
          </select>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <button
          onClick={() => {
            setBatchMode(!batchMode);
            setBatchIndex(0);
          }}
          className={cn(
            'px-4 h-10 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            batchMode
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          <PhoneCall className="w-4 h-4" />
          批量拨打模式
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-3">
          <ListTodo className="w-5 h-5 text-amber-600" />
          复诊待办
          <span className="text-sm font-normal text-slate-400">({rebookTasks.length})</span>
        </h2>
        {rebookTasks.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
            <p className="text-slate-500">暂无复诊待办</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rebookTasks.map((task, idx) => {
            const taskPatient = getPatientById(task.patientId);
            const taskDoctor = getDoctorById(task.doctorId);
            if (!taskPatient) return null;
            return (
              <div key={task.id} style={{ animationDelay: `${idx * 40}ms` }} className="animate-[fadeInUp_0.4s_ease">
                <div className="group relative overflow-hidden rounded-xl bg-white border border-slate-200 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className={cn(
                        'w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center',
                        taskPatient.gender === 'female' ? 'from-pink-100 to-pink-200' : 'from-blue-100 to-blue-200'
                      )}>
                        <User className={cn('w-6 h-6 text-slate-600')} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-slate-800">{taskPatient.name}</h3>
                        <span className="px-1.5 py-0.5 rounded-md text-xs font-medium border bg-purple-50 text-purple-700 border-purple-100">
                          {getTreatmentLabel(task.treatmentType)}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-md text-xs font-medium border',
                          rebookStatusStyles[task.status]
                        )}>
                          {getRebookStatusLabel(task.status)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 mb-2">
                        <span className="text-slate-500">{taskDoctor?.name} 医生</span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span>{getGenderLabel(taskPatient.gender)} · {taskPatient.age}岁</span>
                        <span className="mx-2 text-slate-300">·</span>
                        <a href={`tel:${taskPatient.phone}`} className="text-blue-600 hover:text-blue-700">{taskPatient.phone}</a>
                      </div>
                      <div className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-amber-800 mb-0.5">医生备注</p>
                            <p className="text-sm text-slate-700">{task.doctorNote}</p>
                          </div>
                        </div>
                      </div>
                      {contactingRebookId === task.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={rebookNote}
                            onChange={(e) => setRebookNote(e.target.value)}
                            placeholder="请输入联系备注..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRebookContactSubmit(task.id)}
                              className="px-4 h-9 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              确认标记已联系
                            </button>
                            <button
                              onClick={() => setContactingRebookId(null)}
                              className="px-4 h-9 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : task.status === 'pending_contact' && (
                        <button
                          onClick={() => handleRebookContact(task.id)}
                          className="mt-3 px-4 h-9 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          已联系
                        </button>
                      )}
                      {task.status === 'contacted' && task.nurseNote && (
                        <div className="mt-2 text-xs text-slate-500">
                          <span className="font-medium">护士备注：</span>{task.nurseNote}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-3">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          待处理回访
          <span className="text-sm font-normal text-slate-400">({displayedPendingPlans.length})</span>
        </h2>
        {displayedPendingPlans.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 py-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="w-8 h-8 text-emerald-400" /></div>
            <h3 className="mt-4 text-lg font-semibold text-slate-800">暂无待回访患者</h3>
            <p className="mt-1 text-sm text-slate-500">{searchKeyword || filterPriority !== 'all' || filterTreatment !== 'all' ? '当前筛选条件下没有待回访记录' : '今日回访工作已完成，辛苦了！'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedPendingPlans.map((plan, idx) => (
              <div key={plan.id} style={{ animationDelay: `${idx * 40}ms` }} className="animate-[fadeInUp_0.4s_ease">
                <PatientCard plan={plan} onClick={() => openDrawer(plan)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-3">
          <BellRing className="w-5 h-5 text-indigo-600" />
          稍后提醒
          <span className="text-sm font-normal text-slate-400">({snoozedPlans.length})</span>
        </h2>
        {snoozedPlans.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 py-12 text-center">
            <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">暂无稍后提醒</p>
          </div>
        ) : (
          <div className="space-y-3">
            {snoozedPlans.map((plan, idx) => {
            const snoozePatient = getPatientById(plan.patientId);
            const remindTime = plan.remindAt ? formatDate(new Date(plan.remindAt), 'time') : null;
            if (!snoozePatient) return null;
            return (
              <div key={plan.id} style={{ animationDelay: `${idx * 40}ms` }} className="animate-[fadeInUp_0.4s_ease">
                <div
                  onClick={() => openDrawer(plan)}
                  className="group relative overflow-hidden rounded-xl bg-white border border-indigo-100 bg-indigo-50/30 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-indigo-400" />
                  <div className="flex items-center gap-4 p-4 pl-5">
                    <div className="flex-shrink-0">
                      <div className={cn(
                        'w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center',
                        snoozePatient.gender === 'female' ? 'from-pink-100 to-pink-200' : 'from-blue-100 to-blue-200'
                      )}>
                        <User className="w-6 h-6 text-slate-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800">{snoozePatient.name}</h3>
                        <span className="px-1.5 py-0.5 rounded-md text-xs font-medium border bg-purple-50 text-purple-700 border-purple-100">
                          {getTreatmentLabel(plan.treatmentType)}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-100">
                          {getPriorityLabel(plan.priority)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-600">
                        <span className="font-medium text-blue-600">{getDayStageLabel(plan.daysAfterSurgery)}</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone className="w-3.5 h-3.5" />
                          {snoozePatient.phone}
                        </span>
                        {plan.delayedTimes && plan.delayedTimes > 0 && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <RefreshCw className="w-3.5 h-3.5" />
                            已延后 {plan.delayedTimes} 次
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold text-lg">
                        {remindTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>

      {batchMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            {batchSortedPlans.length === 0 ? (
              <div className="text-center text-slate-500 py-4">
                <p className="text-sm">暂无待回访患者可用于批量拨打</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-slate-600">
                      {batchIndex + 1} / {batchSortedPlans.length}
                    </div>
                    <button
                      onClick={handlePrevPatient}
                      disabled={batchIndex === 0}
                      className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextPatient}
                      disabled={batchIndex === batchSortedPlans.length - 1}
                      className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {currentBatchPatientData && (
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-bold text-slate-800 text-lg">{currentBatchPatientData.name}</div>
                        <div className="text-sm text-slate-500">
                          {getGenderLabel(currentBatchPatientData.gender)} · {currentBatchPatientData.age}岁
                          <span className="mx-2 text-slate-300">·</span>
                          {getTreatmentLabel(currentBatchPatient.treatmentType)}
                        </div>
                      </div>
                      <a
                        href={`tel:${currentBatchPatientData.phone}`}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-xl shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700 transition-all"
                      >
                        <PhoneCall className="w-6 h-6" />
                        {currentBatchPatientData.phone}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBatchMissedCall}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      未接听
                    </button>
                    <button
                      onClick={handleBatchNormal}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      正常
                    </button>
                    <button
                      onClick={handleBatchNeedReview}
                      className="px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      需复核
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={closeDrawer} title="回访详情" width="lg">
        {selectedPlan && patient && (
          <div className="space-y-6 pb-6">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-slate-50 border border-blue-100">
              <div className={cn('w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-md', patient.gender === 'female' ? 'from-pink-100 to-pink-200' : 'from-blue-100 to-blue-200'
              )}>
                <User className={cn('w-8 h-8', patient.gender === 'female' ? 'text-pink-600' : 'text-blue-600'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-slate-800">{patient.name}</h3>
                  <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium border', selectedPlan.priority === 'high' && 'bg-red-50 text-red-700 border-red-100', selectedPlan.priority === 'medium' && 'bg-amber-50 text-amber-700 border-amber-100', selectedPlan.priority === 'low' && 'bg-slate-50 text-slate-600 border-slate-200')}>{getPriorityLabel(selectedPlan.priority)}</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">{getTreatmentLabel(selectedPlan.treatmentType)}</span>
                </div>
                <div className="mt-2 flex items-center gap-4 flex-wrap text-sm">
                  <span className="text-slate-600">{getGenderLabel(patient.gender)} · {patient.age}岁</span>
                  <a href={`tel:${patient.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"><Phone className="w-3.5 h-3.5" />{patient.phone}</a>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" />{doctor?.name} 医生 · {doctor?.department}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{getDayStageLabel(selectedPlan.daysAfterSurgery)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
                <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4" />医嘱摘要</h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{selectedPlan.instructions}</p>
              </div>
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30">
                <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" />禁忌事项</h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{selectedPlan.contraindications}</p>
              </div>
            </div>
            {patientHistoryRecords.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" />历史沟通记录 <span className="text-xs font-normal text-slate-400">({patientHistoryRecords.length})</span></h4>
                <div className="space-y-3">
                  {patientHistoryRecords.slice(0, 3).map(record => (
                    <div key={record.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">{record.followUpDate} · {record.nurseName}</span>
                        <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', record.resultStatus === 'normal' && 'bg-emerald-100 text-emerald-700', record.resultStatus === 'need_review' && 'bg-amber-100 text-amber-700', record.resultStatus === 'rebook' && 'bg-blue-100 text-blue-700')}>{record.resultStatus === 'normal' ? '恢复正常' : record.resultStatus === 'need_review' ? '需医生复核' : '预约复诊'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {record.symptoms.pain && <span className="text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-700">疼痛</span>}
                        {record.symptoms.swelling && <span className="text-[11px] px-2 py-0.5 rounded bg-orange-100 text-orange-700">肿胀</span>}
                        {record.symptoms.bleeding && <span className="text-[11px] px-2 py-0.5 rounded bg-rose-100 text-rose-700">出血</span>}
                        {record.symptoms.medication && <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">按时用药</span>}
                      </div>
                      {record.notes && <p className="text-sm text-slate-600 leading-relaxed">{record.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {patientAllPlans.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-500" />全部回访计划</h4>
                <Timeline plans={patientAllPlans} highlightToday />
              </div>
            )}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" />本次回访记录</h4>
              <FollowUpForm plan={selectedPlan} onSubmit={handleFormSubmit} onDelay={() => closeDrawer()} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
