import { useState, useMemo, useRef } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, AlertCircle, User,
  Phone, Search, Filter, Stethoscope, FileText, AlertTriangle,
  ChevronLeft, ChevronRight, PhoneCall, X, MessageSquare,
  ListTodo, BellRing, RefreshCw, Mic, Check, XCircle
} from 'lucide-react';
import { cn, getTodayStr, formatDate, getTreatmentLabel, getPriorityLabel, getDayStageLabel, getGenderLabel, getRebookStatusLabel } from '@/utils/helpers';
import { useAppStore } from '@/store/useAppStore';
import type { FollowUpPlan, Priority, FollowUpStatus, RebookTaskStatus, TreatmentType } from '@/types';
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

type RebookTab = 'pending' | 'archived';
type RebookDialogAction = 'confirmed' | 'contacted' | 'cancelled';

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
  const getPhoneTemplate = useAppStore(s => s.getPhoneTemplate);
  const plans = useAppStore(s => s.plans);

  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterTreatment, setFilterTreatment] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<FollowUpPlan | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchQueueIndex, setBatchQueueIndex] = useState(0);
  const [batchNote, setBatchNote] = useState('');
  const [batchNoteExpanded, setBatchNoteExpanded] = useState(false);
  const [contactingRebookId, setContactingRebookId] = useState<string | null>(null);
  const [rebookDialogAction, setRebookDialogAction] = useState<RebookDialogAction>('contacted');
  const [rebookNote, setRebookNote] = useState('');
  const [rebookAppointmentDate, setRebookAppointmentDate] = useState('');
  const [rebookTab, setRebookTab] = useState<RebookTab>('pending');

  const today = getTodayStr();
  const notesRef = useRef<HTMLTextAreaElement>(null);

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

  const pendingRebookTasks = useMemo(() => {
    return getRebookTasks().filter(t => t.status === 'pending_contact' || t.status === 'contacted');
  }, [getRebookTasks]);

  const archivedRebookTasks = useMemo(() => {
    return getRebookTasks().filter(t => t.status === 'confirmed' || t.status === 'cancelled');
  }, [getRebookTasks]);

  const displayedRebookTasks = rebookTab === 'pending' ? pendingRebookTasks : archivedRebookTasks;

  const snoozedPlans = useMemo(() => {
    return getSnoozedPlans();
  }, [getSnoozedPlans]);

  const batchQueue = displayedPendingPlans;
  const safeIndex = Math.min(batchQueueIndex, Math.max(0, batchQueue.length - 1));
  const currentBatchPlan = batchQueue.length > 0 ? batchQueue[safeIndex] : null;
  const currentBatchPatientData = currentBatchPlan ? getPatientById(currentBatchPlan.patientId) : null;
  const allBatchCompleted = batchMode && batchQueue.length === 0;

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
    setRebookDialogAction('contacted');
    setRebookNote('');
    setRebookAppointmentDate('');
  };

  const handleRebookContactSubmit = (taskId: string) => {
    const params: {
      status: RebookTaskStatus;
      nurseNote?: string;
      appointmentDate?: string;
    } = {
      status: rebookDialogAction as RebookTaskStatus,
      nurseNote: rebookNote
    };
    if (rebookDialogAction === 'confirmed' && rebookAppointmentDate) {
      params.appointmentDate = rebookAppointmentDate;
    }
    updateRebookTaskStatus(taskId, params);
    setContactingRebookId(null);
    setRebookNote('');
    setRebookAppointmentDate('');
    setRebookDialogAction('contacted');
  };

  const handleBatchMissedCall = () => {
    if (!currentBatchPlan) return;
    delayFollowUp(currentBatchPlan.id, '2h');
    setBatchNote('');
    setBatchNoteExpanded(false);
  };

  const handleBatchNormal = () => {
    if (!currentBatchPlan) return;
    completeFollowUp({
      planId: currentBatchPlan.id,
      symptoms: { pain: false, swelling: false, bleeding: false, medication: true, other: '' },
      resultStatus: 'normal',
      notes: batchNote || '批量拨打 - 患者恢复正常',
      contactSuccess: true
    });
    setBatchNote('');
    setBatchNoteExpanded(false);
  };

  const handleBatchNeedReview = () => {
    if (!currentBatchPlan) return;
    completeFollowUp({
      planId: currentBatchPlan.id,
      symptoms: { pain: false, swelling: false, bleeding: false, medication: false, other: '' },
      resultStatus: 'need_review',
      notes: batchNote || '批量拨打 - 需医生复核',
      contactSuccess: true,
      doctorQuestion: batchNote || '批量拨打标记需复核'
    });
    setBatchNote('');
    setBatchNoteExpanded(false);
  };

  const handleInsertTemplate = () => {
    if (!currentBatchPlan) return;
    const template = getPhoneTemplate(currentBatchPlan.treatmentType as TreatmentType);
    setBatchNote(template);
    setBatchNoteExpanded(true);
    setTimeout(() => {
      notesRef.current?.focus();
    }, 50);
  };

  const handlePrevPatient = () => {
    if (safeIndex > 0) {
      setBatchQueueIndex(safeIndex - 1);
      setBatchNote('');
      setBatchNoteExpanded(false);
    }
  };

  const handleNextPatient = () => {
    if (safeIndex < batchQueue.length - 1) {
      setBatchQueueIndex(safeIndex + 1);
      setBatchNote('');
      setBatchNoteExpanded(false);
    }
  };

  const handleExitBatchMode = () => {
    setBatchMode(false);
    setBatchQueueIndex(0);
    setBatchNote('');
    setBatchNoteExpanded(false);
  };

  const handleEnterBatchMode = () => {
    setBatchMode(true);
    setBatchQueueIndex(0);
    setBatchNote('');
    setBatchNoteExpanded(false);
  };

  const patient = selectedPlan ? getPatientById(selectedPlan.patientId) : null;
  const doctor = selectedPlan ? getDoctorById(selectedPlan.doctorId) : null;
  const patientHistoryRecords = patient ? getRecordsByPatientId(patient.id) : [];
  const patientAllPlans = patient
    ? plans.filter(p => p.patientId === patient.id).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    : [];

  const canGoPrev = safeIndex > 0;
  const canGoNext = safeIndex < batchQueue.length - 1;

  return (
    <div className={cn('space-y-6', batchMode && 'pb-64')}>
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
        {batchMode ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExitBatchMode}
              className="px-4 h-10 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border-2 border-red-500 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" />
              退出批量模式
            </button>
          </div>
        ) : (
          <button
            onClick={handleEnterBatchMode}
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
        )}
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-amber-600" />
              复诊待办
            </h2>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setRebookTab('pending')}
                className={cn(
                  'px-3 h-8 rounded-md text-sm font-medium transition-all',
                  rebookTab === 'pending'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                待处理
                <span className="ml-1.5 text-xs">({pendingRebookTasks.length})</span>
              </button>
              <button
                onClick={() => setRebookTab('archived')}
                className={cn(
                  'px-3 h-8 rounded-md text-sm font-medium transition-all',
                  rebookTab === 'archived'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                已归档
                <span className="ml-1.5 text-xs">({archivedRebookTasks.length})</span>
              </button>
            </div>
          </div>
          {displayedRebookTasks.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
              <p className="text-slate-500">{rebookTab === 'pending' ? '暂无复诊待办' : '暂无已归档复诊记录'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedRebookTasks.map((task, idx) => {
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
                          {task.status === 'confirmed' && task.appointmentDate && (
                            <div className="mt-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                              <span className="font-medium">复诊日期：</span>{task.appointmentDate}
                            </div>
                          )}
                          {task.nurseNote && (
                            <div className="mt-2 text-xs text-slate-500">
                              <span className="font-medium">护士备注：</span>{task.nurseNote}
                            </div>
                          )}
                          {contactingRebookId === task.id ? (
                            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700">联系结果</p>
                                <div className="flex gap-2 flex-wrap">
                                  <label className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all',
                                    rebookDialogAction === 'confirmed'
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-200 hover:border-slate-300'
                                  )}>
                                    <input
                                      type="radio"
                                      name="rebookAction"
                                      value="confirmed"
                                      checked={rebookDialogAction === 'confirmed'}
                                      onChange={() => setRebookDialogAction('confirmed')}
                                      className="sr-only"
                                    />
                                    <Check className={cn('w-4 h-4', rebookDialogAction === 'confirmed' ? 'text-emerald-600' : 'text-transparent')} />
                                    <span className="text-sm font-medium">患者确认复诊</span>
                                  </label>
                                  <label className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all',
                                    rebookDialogAction === 'contacted'
                                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                                      : 'border-slate-200 hover:border-slate-300'
                                  )}>
                                    <input
                                      type="radio"
                                      name="rebookAction"
                                      value="contacted"
                                      checked={rebookDialogAction === 'contacted'}
                                      onChange={() => setRebookDialogAction('contacted')}
                                      className="sr-only"
                                    />
                                    <Check className={cn('w-4 h-4', rebookDialogAction === 'contacted' ? 'text-blue-600' : 'text-transparent')} />
                                    <span className="text-sm font-medium">暂不确认</span>
                                  </label>
                                  <label className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all',
                                    rebookDialogAction === 'cancelled'
                                      ? 'border-slate-500 bg-slate-100 text-slate-700'
                                      : 'border-slate-200 hover:border-slate-300'
                                  )}>
                                    <input
                                      type="radio"
                                      name="rebookAction"
                                      value="cancelled"
                                      checked={rebookDialogAction === 'cancelled'}
                                      onChange={() => setRebookDialogAction('cancelled')}
                                      className="sr-only"
                                    />
                                    <Check className={cn('w-4 h-4', rebookDialogAction === 'cancelled' ? 'text-slate-600' : 'text-transparent')} />
                                    <span className="text-sm font-medium">取消</span>
                                  </label>
                                </div>
                              </div>
                              {rebookDialogAction === 'confirmed' && (
                                <div className="space-y-1.5">
                                  <label className="text-sm font-medium text-slate-700">复诊日期</label>
                                  <input
                                    type="date"
                                    value={rebookAppointmentDate}
                                    onChange={(e) => setRebookAppointmentDate(e.target.value)}
                                    min={today}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                  />
                                </div>
                              )}
                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">护士备注</label>
                                <textarea
                                  value={rebookNote}
                                  onChange={(e) => setRebookNote(e.target.value)}
                                  placeholder="请输入联系备注..."
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                                  rows={2}
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRebookContactSubmit(task.id)}
                                  disabled={rebookDialogAction === 'confirmed' && !rebookAppointmentDate}
                                  className="px-4 h-9 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  确认
                                </button>
                                <button
                                  onClick={() => setContactingRebookId(null)}
                                  className="px-4 h-9 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (task.status === 'pending_contact' || task.status === 'contacted') && (
                            <button
                              onClick={() => handleRebookContact(task.id)}
                              className={cn(
                                'mt-3 px-4 h-9 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                                task.status === 'pending_contact'
                                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              )}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {task.status === 'pending_contact' ? '已联系' : '补充结果'}
                            </button>
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
            {allBatchCompleted ? (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="text-lg font-bold">今日队列已完成</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">所有待回访患者已处理完毕，辛苦了！</p>
                <button
                  onClick={handleExitBatchMode}
                  className="mt-3 px-6 h-10 rounded-lg text-sm font-semibold border-2 border-red-500 text-red-600 hover:bg-red-50 transition-colors"
                >
                  退出批量模式
                </button>
              </div>
            ) : currentBatchPlan && currentBatchPatientData ? (
              <>
                {batchNoteExpanded && (
                  <div className="mb-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <Mic className="w-4 h-4 text-blue-500" />
                        通话笔记
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleInsertTemplate}
                          className="px-2.5 h-7 rounded-md text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          插入话术
                        </button>
                        <button
                          onClick={() => setBatchNoteExpanded(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={notesRef}
                      value={batchNote}
                      onChange={(e) => setBatchNote(e.target.value)}
                      placeholder="通话过程中记录的内容会随回访结果一起保存..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-slate-600">
                      {safeIndex + 1} / {batchQueue.length}
                    </div>
                    <button
                      onClick={handlePrevPatient}
                      disabled={!canGoPrev}
                      className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextPatient}
                      disabled={!canGoNext}
                      className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    {!batchNoteExpanded && (
                      <button
                        onClick={() => setBatchNoteExpanded(true)}
                        className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        <Mic className="w-4 h-4" />
                        笔记
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-bold text-slate-800 text-lg">{currentBatchPatientData.name}</div>
                      <div className="text-sm text-slate-500">
                        {getGenderLabel(currentBatchPatientData.gender)} · {currentBatchPatientData.age}岁
                        <span className="mx-2 text-slate-300">·</span>
                        {getTreatmentLabel(currentBatchPlan.treatmentType)}
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
                    <button
                      onClick={handleExitBatchMode}
                      className="px-4 py-2.5 rounded-xl border-2 border-red-500 text-red-600 font-medium hover:bg-red-50 transition-colors"
                    >
                      退出
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">当前筛选条件下没有可拨打的患者</p>
                <button
                  onClick={handleExitBatchMode}
                  className="mt-3 px-6 h-10 rounded-lg text-sm font-semibold border-2 border-red-500 text-red-600 hover:bg-red-50 transition-colors"
                >
                  退出批量模式
                </button>
              </div>
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
