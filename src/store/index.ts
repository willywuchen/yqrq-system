import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Application, Attachment, Complaint, Message, UserRole, PublicOpinion, OpinionWarningRule, OpinionWarning, OpinionReport, OpinionHandleStatus, OpinionHandleLog, SubsidyApplication, SubsidyOperationLog } from '../types'
import { MockApplications, MockComplaints, MockMessages, MockEnterpriseCertificates, MockPublicOpinions, MockOpinionWarningRules, MockOpinionWarnings, MockOpinionReports, MockSubsidyApplications, MockSubsidyOperationLogs } from '../mock/data'

// 深拷贝工具函数（避免循环引用，针对 mock 数据结构优化）
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as unknown as T
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    result[key] = deepClone((obj as Record<string, unknown>)[key])
  }
  return result as T
}

// 演示数据快照（用于恢复演示数据）
// 使用深拷贝确保 mock 数据对象不被运行时修改污染
const DEMO_SNAPSHOT = {
  applications: deepClone(MockApplications),
  messages: deepClone(MockMessages),
  complaints: deepClone(MockComplaints),
  enterpriseProfile: {
    orgName: '贵州阳光国际旅行社',
    businessLicense: deepClone(MockEnterpriseCertificates.businessLicense),
    travelLicense: deepClone(MockEnterpriseCertificates.travelLicense),
    legalRepId: deepClone(MockEnterpriseCertificates.legalRepId),
  },
  publicOpinions: deepClone(MockPublicOpinions),
  warningRules: deepClone(MockOpinionWarningRules),
  warnings: deepClone(MockOpinionWarnings),
  opinionReports: deepClone(MockOpinionReports),
  subsidyApplications: deepClone(MockSubsidyApplications),
  subsidyOperationLogs: deepClone(MockSubsidyOperationLogs),
}

// 企业资质档案（基础材料预存）
export interface EnterpriseProfile {
  orgName: string
  businessLicense?: Attachment // 营业执照
  travelLicense?: Attachment // 旅行社业务经营许可证
  legalRepId?: Attachment // 法定代表人身份证
  // 完税凭证和信用查询截图每次申报单独上传（实时性要求）
}

interface AppState {
  // 当前用户
  currentUser: {
    name: string
    role: UserRole
    org?: string
  }
  setCurrentUser: (user: { name: string; role: UserRole; org?: string }) => void

  // 申报数据
  applications: Application[]
  addApplication: (app: Application) => void
  updateApplication: (id: string, patch: Partial<Application>) => void
  deleteApplication: (id: string) => void

  // 企业资质档案
  enterpriseProfile: EnterpriseProfile
  setEnterpriseProfile: (profile: EnterpriseProfile) => void

  // 消息
  messages: Message[]
  markMessageRead: (id: string) => void
  markAllRead: () => void
  addMessage: (msg: Message) => void

  // 演示数据管理（便于给客户演示）
  resetAllData: () => void // 清空所有测试数据
  restoreDemoData: () => void // 恢复演示数据

  // 投诉台账
  complaints: Complaint[]
  addComplaint: (complaint: Complaint) => void
  updateComplaint: (id: string, patch: Partial<Complaint>) => void
  deleteComplaint: (id: string) => void
  importComplaints: (complaints: Complaint[]) => void

  // 舆情管理
  publicOpinions: PublicOpinion[]
  addOpinion: (opinion: PublicOpinion) => void
  updateOpinion: (id: string, patch: Partial<PublicOpinion>) => void
  deleteOpinion: (id: string) => void
  appendOpinionLog: (id: string, log: OpinionHandleLog) => void
  setOpinionStatus: (id: string, status: OpinionHandleStatus, log: OpinionHandleLog) => void

  // 预警规则
  warningRules: OpinionWarningRule[]
  addWarningRule: (rule: OpinionWarningRule) => void
  updateWarningRule: (id: string, patch: Partial<OpinionWarningRule>) => void
  deleteWarningRule: (id: string) => void

  // 预警工单
  warnings: OpinionWarning[]
  addWarning: (warning: OpinionWarning) => void
  handleWarning: (id: string, handleBy: string, handleOpinion: string) => void

  // 舆情报告
  opinionReports: OpinionReport[]
  addOpinionReport: (report: OpinionReport) => void
  deleteOpinionReport: (id: string) => void

  // 引客入黔补贴管理
  subsidyApplications: SubsidyApplication[]
  subsidyOperationLogs: SubsidyOperationLog[]
  addSubsidyApplication: (app: SubsidyApplication) => void
  updateSubsidyApplication: (id: string, patch: Partial<SubsidyApplication>) => void
  deleteSubsidyApplication: (id: string) => void
  appendSubsidyLog: (log: SubsidyOperationLog) => void
  // 锁定时间检查（前端层面模拟定时任务）
  refreshSubsidyLockStatus: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: {
        name: '李明',
        role: 'applicant',
        org: '贵州阳光国际旅行社',
      },
      setCurrentUser: (user) => set({ currentUser: user }),

      applications: MockApplications,
      addApplication: (app) =>
        set((state) => ({ applications: [app, ...state.applications] })),
      updateApplication: (id, patch) =>
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id ? { ...a, ...patch } : a,
          ),
        })),
      deleteApplication: (id) =>
        set((state) => ({
          applications: state.applications.filter((a) => a.id !== id),
        })),

      enterpriseProfile: {
        orgName: '贵州阳光国际旅行社',
        businessLicense: deepClone(MockEnterpriseCertificates.businessLicense),
        travelLicense: deepClone(MockEnterpriseCertificates.travelLicense),
        legalRepId: deepClone(MockEnterpriseCertificates.legalRepId),
      },
      setEnterpriseProfile: (profile) => set({ enterpriseProfile: profile }),

      messages: MockMessages,
      markMessageRead: (id) =>
        set((state) => ({
          messages: state.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
        })),
      markAllRead: () =>
        set((state) => ({
          messages: state.messages.map((m) => ({ ...m, read: true })),
        })),
      addMessage: (msg) =>
        set((state) => ({ messages: [msg, ...state.messages] })),

      // 清空所有测试数据（便于客户演示）
      resetAllData: () => {
        // 同步清空 localStorage 中的持久化数据，避免刷新后被旧数据覆盖
        try {
          localStorage.removeItem('yqrq-store')
        } catch {
          // 忽略 localStorage 访问异常
        }
        set({
          applications: [],
          messages: [],
          enterpriseProfile: {
            orgName: '贵州阳光国际旅行社',
            businessLicense: deepClone(MockEnterpriseCertificates.businessLicense),
            travelLicense: deepClone(MockEnterpriseCertificates.travelLicense),
            legalRepId: deepClone(MockEnterpriseCertificates.legalRepId),
          },
          publicOpinions: [],
          warningRules: deepClone(MockOpinionWarningRules),
          warnings: [],
          opinionReports: [],
          subsidyApplications: [],
          subsidyOperationLogs: [],
        })
      },

      // 恢复演示数据
      restoreDemoData: () =>
        set({
          applications: deepClone(DEMO_SNAPSHOT.applications),
          messages: deepClone(DEMO_SNAPSHOT.messages),
          complaints: deepClone(DEMO_SNAPSHOT.complaints),
          enterpriseProfile: deepClone(DEMO_SNAPSHOT.enterpriseProfile),
          publicOpinions: deepClone(DEMO_SNAPSHOT.publicOpinions),
          warningRules: deepClone(DEMO_SNAPSHOT.warningRules),
          warnings: deepClone(DEMO_SNAPSHOT.warnings),
          opinionReports: deepClone(DEMO_SNAPSHOT.opinionReports),
          subsidyApplications: deepClone(DEMO_SNAPSHOT.subsidyApplications),
          subsidyOperationLogs: deepClone(DEMO_SNAPSHOT.subsidyOperationLogs),
        }),

      // 投诉台账
      complaints: MockComplaints,
      addComplaint: (complaint) =>
        set((state) => ({ complaints: [complaint, ...state.complaints] })),
      updateComplaint: (id, patch) =>
        set((state) => ({
          complaints: state.complaints.map((c) =>
            c.id === id ? { ...c, ...patch, updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19) } : c,
          ),
        })),
      deleteComplaint: (id) =>
        set((state) => ({
          complaints: state.complaints.filter((c) => c.id !== id),
        })),
      importComplaints: (newComplaints) =>
        set((state) => ({ complaints: [...newComplaints, ...state.complaints] })),

      // 舆情管理
      publicOpinions: MockPublicOpinions,
      addOpinion: (opinion) =>
        set((state) => ({ publicOpinions: [opinion, ...state.publicOpinions] })),
      updateOpinion: (id, patch) =>
        set((state) => ({
          publicOpinions: state.publicOpinions.map((o) =>
            o.id === id ? { ...o, ...patch, updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19) } : o,
          ),
        })),
      deleteOpinion: (id) =>
        set((state) => ({
          publicOpinions: state.publicOpinions.filter((o) => o.id !== id),
        })),
      appendOpinionLog: (id, log) =>
        set((state) => ({
          publicOpinions: state.publicOpinions.map((o) =>
            o.id === id ? { ...o, handleLogs: [...o.handleLogs, log] } : o,
          ),
        })),
      setOpinionStatus: (id, status, log) =>
        set((state) => ({
          publicOpinions: state.publicOpinions.map((o) =>
            o.id === id
              ? {
                  ...o,
                  handleStatus: status,
                  updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
                  handleLogs: [...o.handleLogs, log],
                }
              : o,
          ),
        })),

      // 预警规则
      warningRules: MockOpinionWarningRules,
      addWarningRule: (rule) =>
        set((state) => ({ warningRules: [rule, ...state.warningRules] })),
      updateWarningRule: (id, patch) =>
        set((state) => ({
          warningRules: state.warningRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteWarningRule: (id) =>
        set((state) => ({
          warningRules: state.warningRules.filter((r) => r.id !== id),
        })),

      // 预警工单
      warnings: MockOpinionWarnings,
      addWarning: (warning) =>
        set((state) => ({ warnings: [warning, ...state.warnings] })),
      handleWarning: (id, handleBy, handleOpinion) =>
        set((state) => ({
          warnings: state.warnings.map((w) =>
            w.id === id
              ? {
                  ...w,
                  handled: true,
                  handleBy,
                  handleOpinion,
                  handleTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
                }
              : w,
          ),
        })),

      // 舆情报告
      opinionReports: MockOpinionReports,
      addOpinionReport: (report) =>
        set((state) => ({ opinionReports: [report, ...state.opinionReports] })),
      deleteOpinionReport: (id) =>
        set((state) => ({
          opinionReports: state.opinionReports.filter((r) => r.id !== id),
        })),

      // 引客入黔补贴管理
      subsidyApplications: MockSubsidyApplications,
      subsidyOperationLogs: MockSubsidyOperationLogs,
      addSubsidyApplication: (app) =>
        set((state) => ({ subsidyApplications: [app, ...state.subsidyApplications] })),
      updateSubsidyApplication: (id, patch) =>
        set((state) => ({
          subsidyApplications: state.subsidyApplications.map((a) =>
            a.id === id
              ? { ...a, ...patch, updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19) }
              : a,
          ),
        })),
      deleteSubsidyApplication: (id) =>
        set((state) => ({
          subsidyApplications: state.subsidyApplications.filter((a) => a.id !== id),
          subsidyOperationLogs: state.subsidyOperationLogs.filter((l) => l.applicationId !== id),
        })),
      appendSubsidyLog: (log) =>
        set((state) => ({ subsidyOperationLogs: [...state.subsidyOperationLogs, log] })),
      // 锁定时间检查（前端层面模拟定时任务）
      // 调用时机：列表页加载、详情页加载、保存时校验
      refreshSubsidyLockStatus: () => {
        const now = Date.now()
        set((state) => {
          const apps = state.subsidyApplications.map((a) => {
            if (a.status !== 'submitted') return a
            const deadline = new Date(a.lockDeadline.replace(/-/g, '/')).getTime()
            if (now >= deadline) {
              return { ...a, status: 'locked' as const }
            }
            return a
          })
          // 收集本次新锁定的记录，生成锁定日志
          const newlyLockedIds = apps
            .filter((a, idx) =>
              a.status === 'locked' &&
              state.subsidyApplications[idx].status === 'submitted'
            )
            .map((a) => a.id)
          const newLogs: SubsidyOperationLog[] = newlyLockedIds.map((id) => ({
            id: `sol-auto-${id}-${Date.now()}`,
            applicationId: id,
            operator: '系统',
            operatorRole: 'admin',
            action: 'lock',
            comment: '到达锁定时间，自动锁定',
            time: new Date().toISOString().replace('T', ' ').substring(0, 19),
          }))
          return {
            subsidyApplications: apps,
            subsidyOperationLogs: newLogs.length > 0
              ? [...state.subsidyOperationLogs, ...newLogs]
              : state.subsidyOperationLogs,
          }
        })
      },
    }),
    {
      name: 'yqrq-store',
      // 数据版本：当 mock 数据结构发生变化时递增
      // 版本不匹配时，subsidy 数据会被重置为最新 mock 数据
      version: 2,
      migrate: (persistedState: any, version) => {
        // 版本 < 2：补贴管理 mock 数据结构调整（团队接待奖励由9行合并为3行）
        // 直接重置补贴相关数据为最新 mock 数据
        if (version < 2) {
          return {
            ...persistedState,
            subsidyApplications: deepClone(MockSubsidyApplications),
            subsidyOperationLogs: deepClone(MockSubsidyOperationLogs),
          }
        }
        return persistedState
      },
      // 仅持久化数据字段，不持久化方法
      partialize: (state) => ({
        applications: state.applications,
        messages: state.messages,
        enterpriseProfile: state.enterpriseProfile,
        complaints: state.complaints,
        publicOpinions: state.publicOpinions,
        warningRules: state.warningRules,
        warnings: state.warnings,
        opinionReports: state.opinionReports,
        subsidyApplications: state.subsidyApplications,
        subsidyOperationLogs: state.subsidyOperationLogs,
      }),
    },
  ),
)

// 演示模式：将 store 挂载到 window，便于通过控制台或脚本调用
// 使用方式：window.__resetData() 清空所有数据，window.__restoreData() 恢复演示数据
if (typeof window !== 'undefined') {
  ;(window as any).__resetData = () => useStore.getState().resetAllData()
  ;(window as any).__restoreData = () => useStore.getState().restoreDemoData()
  ;(window as any).__store = useStore
}
