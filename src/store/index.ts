import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Application, Attachment, Complaint, Message, UserRole, PublicOpinion, OpinionWarningRule, OpinionWarning, OpinionReport, OpinionHandleStatus, OpinionHandleLog, SubsidyApplication, SubsidyOperationLog, ComplaintReport, ComplaintReportTemplate, ComplaintReportArchiveLog } from '../types'
import { getDefaultReportTemplates } from '../types'
import { MockApplications, MockComplaints, MockMessages, MockEnterpriseCertificates, MockPublicOpinions, MockOpinionWarningRules, MockOpinionWarnings, MockOpinionReports, MockSubsidyApplications, MockSubsidyOperationLogs, MockComplaintReports, MockComplaintReportTemplates, MockComplaintReportArchiveLogs } from '../mock/data'
import type {
  Vehicle,
  TrackPoint,
  VideoChannel,
  VideoClip,
  Transcript,
  RiskRule,
  RiskEvent,
  EvidenceChain,
  CoachMonitorOperationLog,
  EventStatus,
  RegionLevel,
} from '../types/coach-monitor'
import {
  MockVehicles,
  MockTracks,
  MockVideoChannels,
  MockVideoClips,
  MockTranscripts,
  MockRiskRules,
  MockRiskEvents,
  MockEvidenceChains,
  MockCoachMonitorLogs,
} from '../mock/coach-monitor'
import type { TrainingCategory, TrainingMaterial } from '../types/training'
import { MockTrainingCategories, MockTrainingMaterials } from '../mock/training'
import type { Announcement, AnnouncementCategory, AnnouncementConfirmMethod, AnnouncementReadRecord } from '../types/announcements'
import { MockAnnouncements, MockAnnouncementCategories, MockAnnouncementReads } from '../mock/announcements'

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
  // 投诉数据报表
  complaintReports: deepClone(MockComplaintReports),
  complaintReportTemplates: deepClone(MockComplaintReportTemplates),
  complaintReportArchiveLogs: deepClone(MockComplaintReportArchiveLogs),
  // 旅游包车智慧监管
  vehicles: deepClone(MockVehicles),
  tracks: deepClone(MockTracks),
  videoChannels: deepClone(MockVideoChannels),
  videoClips: deepClone(MockVideoClips),
  transcripts: deepClone(MockTranscripts),
  riskRules: deepClone(MockRiskRules),
  riskEvents: deepClone(MockRiskEvents),
  evidenceChains: deepClone(MockEvidenceChains),
  coachMonitorLogs: deepClone(MockCoachMonitorLogs),
  // 学习培训管理
  trainingCategories: deepClone(MockTrainingCategories),
  trainingMaterials: deepClone(MockTrainingMaterials),
  // 公告发布管理
  announcementCategories: deepClone(MockAnnouncementCategories),
  announcements: deepClone(MockAnnouncements),
  announcementReads: deepClone(MockAnnouncementReads),
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
  addOpinions: (opinions: PublicOpinion[]) => void
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

  // ========== 投诉数据报表 ==========
  complaintReports: ComplaintReport[]
  complaintReportTemplates: ComplaintReportTemplate[]
  complaintReportArchiveLogs: ComplaintReportArchiveLog[]
  addComplaintReport: (report: ComplaintReport) => void
  deleteComplaintReport: (id: string) => void // 软删除（30 天内可恢复）
  restoreComplaintReport: (id: string) => void
  appendComplaintReportLog: (log: ComplaintReportArchiveLog) => void
  updateComplaintReportTemplate: (templateId: string, patch: Partial<ComplaintReportTemplate>) => void
  restoreDefaultTemplates: () => void

  // ========== 旅游包车智慧监管 ==========
  // 当前用户的监管层级（仅 final_reviewer / admin 角色启用）
  // 用于演示三级权限切换，Mock 数据按此过滤
  coachRegionLevel: RegionLevel
  setCoachRegionLevel: (level: RegionLevel) => void

  vehicles: Vehicle[]
  addVehicle: (v: Vehicle) => void
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void
  deleteVehicle: (id: string) => void

  tracks: TrackPoint[]

  videoChannels: VideoChannel[]
  videoClips: VideoClip[]
  addVideoClip: (clip: VideoClip) => void

  transcripts: Transcript[]
  addTranscript: (t: Transcript) => void

  riskRules: RiskRule[]
  addRiskRule: (r: RiskRule) => void
  updateRiskRule: (id: string, patch: Partial<RiskRule>) => void
  deleteRiskRule: (id: string) => void

  riskEvents: RiskEvent[]
  addRiskEvent: (e: RiskEvent) => void
  updateRiskEvent: (id: string, patch: Partial<RiskEvent>) => void
  handleRiskEvent: (
    id: string,
    action: 'confirm' | 'mark_false' | 'suspend',
    operator: string,
    note: string,
  ) => void
  archiveRiskEvent: (id: string, operator: string, note: string) => void

  evidenceChains: EvidenceChain[]
  coachMonitorLogs: CoachMonitorOperationLog[]
  appendCoachMonitorLog: (log: CoachMonitorOperationLog) => void

  // ========== 学习培训管理 ==========
  trainingCategories: TrainingCategory[]
  trainingMaterials: TrainingMaterial[]
  addTrainingCategory: (cat: TrainingCategory) => void
  updateTrainingCategory: (id: string, patch: Partial<TrainingCategory>) => void
  deleteTrainingCategory: (id: string) => void
  addTrainingMaterial: (m: TrainingMaterial) => void
  updateTrainingMaterial: (id: string, patch: Partial<TrainingMaterial>) => void
  deleteTrainingMaterial: (id: string) => void
  incrementTrainingView: (id: string) => void

  // ========== 公告发布管理 ==========
  announcementCategories: AnnouncementCategory[]
  announcements: Announcement[]
  announcementReads: AnnouncementReadRecord[]
  addAnnouncementCategory: (cat: AnnouncementCategory) => void
  updateAnnouncementCategory: (id: string, patch: Partial<AnnouncementCategory>) => void
  deleteAnnouncementCategory: (id: string) => void
  addAnnouncement: (a: Announcement) => void
  updateAnnouncement: (id: string, patch: Partial<Announcement>) => void
  deleteAnnouncement: (id: string) => void
  incrementAnnouncementView: (id: string) => void
  // 阅读留痕：强制公告点"我已阅读并知晓"、普通公告打开详情时调用；同一公告同一账号仅一条（PRD §5.5）
  markAnnouncementRead: (
    announcementId: string,
    account: { id: string; name: string; userType: 'dept' | 'agency'; orgName: string },
    method: AnnouncementConfirmMethod,
  ) => void
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
          // 投诉数据报表：清空报表与日志，保留默认章节模板
          complaintReports: [],
          complaintReportArchiveLogs: [],
          complaintReportTemplates: getDefaultReportTemplates(),
          // 旅游包车智慧监管：仅清空业务数据，保留规则模板
          vehicles: [],
          tracks: [],
          videoChannels: [],
          videoClips: [],
          transcripts: [],
          riskRules: deepClone(MockRiskRules),
          riskEvents: [],
          evidenceChains: [],
          coachMonitorLogs: [],
          // 学习培训管理：保留默认分类配置，清空资料数据
          trainingCategories: deepClone(MockTrainingCategories),
          trainingMaterials: [],
          // 公告发布管理：保留默认分类配置，清空公告与阅读记录
          announcementCategories: deepClone(MockAnnouncementCategories),
          announcements: [],
          announcementReads: [],
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
        // 投诉数据报表
        complaintReports: deepClone(DEMO_SNAPSHOT.complaintReports),
        complaintReportTemplates: deepClone(DEMO_SNAPSHOT.complaintReportTemplates),
        complaintReportArchiveLogs: deepClone(DEMO_SNAPSHOT.complaintReportArchiveLogs),
          // 旅游包车智慧监管
          vehicles: deepClone(DEMO_SNAPSHOT.vehicles),
          tracks: deepClone(DEMO_SNAPSHOT.tracks),
          videoChannels: deepClone(DEMO_SNAPSHOT.videoChannels),
          videoClips: deepClone(DEMO_SNAPSHOT.videoClips),
          transcripts: deepClone(DEMO_SNAPSHOT.transcripts),
          riskRules: deepClone(DEMO_SNAPSHOT.riskRules),
          riskEvents: deepClone(DEMO_SNAPSHOT.riskEvents),
          evidenceChains: deepClone(DEMO_SNAPSHOT.evidenceChains),
          coachMonitorLogs: deepClone(DEMO_SNAPSHOT.coachMonitorLogs),
          // 学习培训管理
          trainingCategories: deepClone(DEMO_SNAPSHOT.trainingCategories),
          trainingMaterials: deepClone(DEMO_SNAPSHOT.trainingMaterials),
          // 公告发布管理
          announcementCategories: deepClone(DEMO_SNAPSHOT.announcementCategories),
          announcements: deepClone(DEMO_SNAPSHOT.announcements),
          announcementReads: deepClone(DEMO_SNAPSHOT.announcementReads),
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
      addOpinions: (opinions) =>
        set((state) => ({ publicOpinions: [...opinions, ...state.publicOpinions] })),
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

      // ========== 投诉数据报表 ==========
      complaintReports: MockComplaintReports,
      complaintReportTemplates: MockComplaintReportTemplates,
      complaintReportArchiveLogs: MockComplaintReportArchiveLogs,
      addComplaintReport: (report) =>
        set((state) => ({ complaintReports: [report, ...state.complaintReports] })),
      deleteComplaintReport: (id) =>
        set((state) => {
          const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
          return {
            complaintReports: state.complaintReports.map((r) =>
              r.id === id ? { ...r, deleted: true, deletedAt: now } : r,
            ),
          }
        }),
      restoreComplaintReport: (id) =>
        set((state) => ({
          complaintReports: state.complaintReports.map((r) =>
            r.id === id ? { ...r, deleted: false, deletedAt: undefined } : r,
          ),
        })),
      appendComplaintReportLog: (log) =>
        set((state) => ({ complaintReportArchiveLogs: [log, ...state.complaintReportArchiveLogs] })),
      updateComplaintReportTemplate: (templateId, patch) =>
        set((state) => ({
          complaintReportTemplates: state.complaintReportTemplates.map((t) =>
            t.templateId === templateId ? { ...t, ...patch } : t,
          ),
        })),
      restoreDefaultTemplates: () =>
        set({ complaintReportTemplates: getDefaultReportTemplates() }),

      // ========== 旅游包车智慧监管 ==========
      // 默认省级视角（final_reviewer / admin 角色）
      coachRegionLevel: 'province',
      setCoachRegionLevel: (level) => set({ coachRegionLevel: level }),

      vehicles: MockVehicles,
      addVehicle: (v) => set((state) => ({ vehicles: [v, ...state.vehicles] })),
      updateVehicle: (id, patch) =>
        set((state) => ({
          vehicles: state.vehicles.map((v) =>
            v.vehicleId === id
              ? { ...v, ...patch, updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19) }
              : v,
          ),
        })),
      deleteVehicle: (id) =>
        set((state) => ({ vehicles: state.vehicles.filter((v) => v.vehicleId !== id) })),

      tracks: MockTracks,

      videoChannels: MockVideoChannels,
      videoClips: MockVideoClips,
      addVideoClip: (clip) => set((state) => ({ videoClips: [clip, ...state.videoClips] })),

      transcripts: MockTranscripts,
      addTranscript: (t) => set((state) => ({ transcripts: [t, ...state.transcripts] })),

      riskRules: MockRiskRules,
      addRiskRule: (r) => set((state) => ({ riskRules: [r, ...state.riskRules] })),
      updateRiskRule: (id, patch) =>
        set((state) => ({
          riskRules: state.riskRules.map((r) =>
            r.ruleId === id
              ? { ...r, ...patch, updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19) }
              : r,
          ),
        })),
      deleteRiskRule: (id) =>
        set((state) => ({ riskRules: state.riskRules.filter((r) => r.ruleId !== id) })),

      riskEvents: MockRiskEvents,
      addRiskEvent: (e) => set((state) => ({ riskEvents: [e, ...state.riskEvents] })),
      updateRiskEvent: (id, patch) =>
        set((state) => ({
          riskEvents: state.riskEvents.map((e) => (e.eventId === id ? { ...e, ...patch } : e)),
        })),
      handleRiskEvent: (id, action, operator, note) =>
        set((state) => {
          const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
          let newStatus: EventStatus = 'pending'
          if (action === 'confirm') newStatus = 'confirmed'
          else if (action === 'mark_false') newStatus = 'false_positive'
          else if (action === 'suspend') newStatus = 'suspended'
          return {
            riskEvents: state.riskEvents.map((e) =>
              e.eventId === id
                ? { ...e, status: newStatus, handledBy: operator, handleNote: note, handleTime: now }
                : e,
            ),
          }
        }),
      archiveRiskEvent: (id, operator, note) =>
        set((state) => {
          const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
          const event = state.riskEvents.find((e) => e.eventId === id)
          if (!event) return state
          const evidenceId = `EV${Date.now()}`
          const clipIds = event.videoClipId ? [event.videoClipId] : []
          const newEvidence: EvidenceChain = {
            evidenceId,
            eventId: id,
            vehicleId: event.vehicleId,
            videoClipIds: clipIds,
            transcriptIds: [event.transcriptId],
            ruleId: event.ruleId,
            hitKeywords: event.hitKeywords,
            occurredAt: event.occurredAt,
            trackPoints: state.tracks.filter((t) => t.vehicleId === event.vehicleId),
            archivedBy: operator,
            archivedAt: now,
            note: note || event.handleNote,
          }
          return {
            riskEvents: state.riskEvents.map((e) =>
              e.eventId === id
                ? { ...e, status: 'archived' as const, handledBy: operator, handleNote: note, handleTime: now, evidenceChainId: evidenceId }
                : e,
            ),
            evidenceChains: [newEvidence, ...state.evidenceChains],
          }
        }),

      evidenceChains: MockEvidenceChains,
      coachMonitorLogs: MockCoachMonitorLogs,
      appendCoachMonitorLog: (log) =>
        set((state) => ({ coachMonitorLogs: [log, ...state.coachMonitorLogs] })),

      // ========== 学习培训管理 ==========
      trainingCategories: MockTrainingCategories,
      trainingMaterials: MockTrainingMaterials,
      addTrainingCategory: (cat) =>
        set((state) => ({ trainingCategories: [cat, ...state.trainingCategories] })),
      updateTrainingCategory: (id, patch) =>
        set((state) => ({
          trainingCategories: state.trainingCategories.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        })),
      deleteTrainingCategory: (id) =>
        set((state) => ({ trainingCategories: state.trainingCategories.filter((c) => c.id !== id) })),
      addTrainingMaterial: (m) =>
        set((state) => ({ trainingMaterials: [m, ...state.trainingMaterials] })),
      updateTrainingMaterial: (id, patch) =>
        set((state) => ({
          trainingMaterials: state.trainingMaterials.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      deleteTrainingMaterial: (id) =>
        set((state) => ({ trainingMaterials: state.trainingMaterials.filter((m) => m.id !== id) })),
      incrementTrainingView: (id) =>
        set((state) => ({
          trainingMaterials: state.trainingMaterials.map((m) =>
            m.id === id ? { ...m, viewCount: m.viewCount + 1 } : m,
          ),
        })),

      // ========== 公告发布管理 ==========
      announcementCategories: deepClone(MockAnnouncementCategories),
      announcements: deepClone(MockAnnouncements),
      announcementReads: deepClone(MockAnnouncementReads),
      addAnnouncementCategory: (cat) =>
        set((state) => ({ announcementCategories: [cat, ...state.announcementCategories] })),
      updateAnnouncementCategory: (id, patch) =>
        set((state) => ({
          announcementCategories: state.announcementCategories.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        })),
      deleteAnnouncementCategory: (id) =>
        set((state) => ({
          announcementCategories: state.announcementCategories.filter((c) => c.id !== id),
        })),
      addAnnouncement: (a) => set((state) => ({ announcements: [a, ...state.announcements] })),
      updateAnnouncement: (id, patch) =>
        set((state) => ({
          announcements: state.announcements.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      deleteAnnouncement: (id) =>
        set((state) => ({
          announcements: state.announcements.filter((a) => a.id !== id),
          // 公告删除时同步清理其阅读记录（仅草稿/已下架可删，PRD §5.3）
          announcementReads: state.announcementReads.filter((r) => r.announcementId !== id),
        })),
      incrementAnnouncementView: (id) =>
        set((state) => ({
          announcements: state.announcements.map((a) =>
            a.id === id ? { ...a, viewCount: a.viewCount + 1 } : a,
          ),
        })),
      markAnnouncementRead: (announcementId, account, method) =>
        set((state) => {
          const exists = state.announcementReads.some(
            (r) => r.announcementId === announcementId && r.userId === account.id,
          )
          if (exists) return state
          return {
            announcementReads: [
              {
                id: `aread-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                announcementId,
                userId: account.id,
                userName: account.name,
                userType: account.userType,
                orgName: account.orgName,
                confirmMethod: method,
                readTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
              },
              ...state.announcementReads,
            ],
          }
        }),
    }),
    {
      name: 'yqrq-store',
      // 数据版本：当 mock 数据结构发生变化时递增
      // 版本不匹配时，对应模块数据会被重置为最新 mock 数据
      version: 18,
      migrate: (persistedState: any, version) => {
        // 版本 < 2：补贴管理 mock 数据结构调整（团队接待奖励由9行合并为3行）
        if (version < 2) {
          persistedState = {
            ...persistedState,
            subsidyApplications: deepClone(MockSubsidyApplications),
            subsidyOperationLogs: deepClone(MockSubsidyOperationLogs),
          }
        }
        // 版本 < 3：新增旅游包车智慧监管模块，初始化全部 mock 数据
        if (version < 3) {
          persistedState = {
            ...persistedState,
            coachRegionLevel: 'province',
            vehicles: deepClone(MockVehicles),
            tracks: deepClone(MockTracks),
            videoChannels: deepClone(MockVideoChannels),
            videoClips: deepClone(MockVideoClips),
            transcripts: deepClone(MockTranscripts),
            riskRules: deepClone(MockRiskRules),
            riskEvents: deepClone(MockRiskEvents),
            evidenceChains: deepClone(MockEvidenceChains),
            coachMonitorLogs: deepClone(MockCoachMonitorLogs),
          }
        }
        // 版本 < 4：新增投诉数据报表模块，初始化全部 mock 数据
        if (version < 4) {
          persistedState = {
            ...persistedState,
            complaintReports: deepClone(MockComplaintReports),
            complaintReportTemplates: deepClone(MockComplaintReportTemplates),
            complaintReportArchiveLogs: deepClone(MockComplaintReportArchiveLogs),
          }
        }
        // 版本 < 5：V1.2 报表结构调整（新增聚类分析段、弱化办理质量、注入模拟风险研判段）
        // 同步补充 4 条 8 月投诉，用于演示同一商家重复投诉、区域×类型高发组合
        if (version < 5) {
          persistedState = {
            ...persistedState,
            complaints: deepClone(MockComplaints),
            complaintReports: deepClone(MockComplaintReports),
            complaintReportTemplates: deepClone(MockComplaintReportTemplates),
          }
        }
        // 版本 < 6：V1.3 研判分析收敛到风险研判段（移除聚类分析独立章，新增关键词/环比/风险等级/舆情关联/典型案例）
        if (version < 6) {
          persistedState = {
            ...persistedState,
            complaintReports: deepClone(MockComplaintReports),
            complaintReportTemplates: deepClone(MockComplaintReportTemplates),
          }
        }
        // 版本 < 7：修复 HMR 期间旧快照缺 V1.3 字段导致预览崩溃；强制重置报表/投诉/模板为最新结构
        if (version < 7) {
          persistedState = {
            ...persistedState,
            complaints: deepClone(MockComplaints),
            complaintReports: deepClone(MockComplaintReports),
            complaintReportTemplates: deepClone(MockComplaintReportTemplates),
          }
        }
        // 版本 < 8：新增学习培训管理模块，初始化全部 mock 数据
        if (version < 8) {
          persistedState = {
            ...persistedState,
            trainingCategories: deepClone(MockTrainingCategories),
            trainingMaterials: deepClone(MockTrainingMaterials),
          }
        }
        // 版本 < 9：新增公告发布管理模块，初始化全部 mock 数据
        if (version < 9) {
          persistedState = {
            ...persistedState,
            announcementCategories: deepClone(MockAnnouncementCategories),
            announcements: deepClone(MockAnnouncements),
            announcementReads: deepClone(MockAnnouncementReads),
          }
        }
        // 版本 < 10：演示人物"陈厅长"统一更名为"陈华"，重置含操作人姓名的数据集
        if (version < 10) {
          persistedState = {
            ...persistedState,
            applications: deepClone(MockApplications),
            complaints: deepClone(MockComplaints),
            publicOpinions: deepClone(MockPublicOpinions),
            warnings: deepClone(MockOpinionWarnings),
            complaintReports: deepClone(MockComplaintReports),
            complaintReportArchiveLogs: deepClone(MockComplaintReportArchiveLogs),
            riskEvents: deepClone(MockRiskEvents),
            evidenceChains: deepClone(MockEvidenceChains),
            coachMonitorLogs: deepClone(MockCoachMonitorLogs),
            announcements: deepClone(MockAnnouncements),
            announcementReads: deepClone(MockAnnouncementReads),
            trainingMaterials: deepClone(MockTrainingMaterials),
          }
        }
        // 版本 < 11：V1.4 报表重构——取消三类报表类型与淡旺季日历，报表由手动选择日期决定
        // 重置投诉（扩充至 50 条）、报表（无类型新结构）与章节模板（单一通用模板），并清除已废弃的日历数据
        if (version < 11) {
          persistedState = {
            ...persistedState,
            complaints: deepClone(MockComplaints),
            complaintReports: deepClone(MockComplaintReports),
            complaintReportTemplates: deepClone(MockComplaintReportTemplates),
            complaintReportArchiveLogs: deepClone(MockComplaintReportArchiveLogs),
          }
          delete (persistedState as Record<string, unknown>).seasonCalendar
        }
        // 版本 < 12：V1.5 默认章节去掉"办理质量/移送问题线索"，交叉统计表改分组结构，重置报表与章节模板
        if (version < 12) {
          persistedState = {
            ...persistedState,
            complaintReports: deepClone(MockComplaintReports),
            complaintReportTemplates: deepClone(MockComplaintReportTemplates),
          }
        }
        // 版本 < 13：V1.6 报表新增"投诉转办情况"章与图表解读段；投诉补充转办部门/主题字段，重置投诉、报表与章节模板
        if (version < 13) {
          persistedState = {
            ...persistedState,
            complaints: deepClone(MockComplaints),
            complaintReports: deepClone(MockComplaintReports),
            complaintReportTemplates: deepClone(MockComplaintReportTemplates),
          }
        }
        // 版本 < 14：补贴申报 mock 记录3奖励项由"入境旅游团队接待奖励"调整为"旅游宣传奖励"，
        // 使三大互斥奖励项各有演示数据，重置补贴申报数据
        if (version < 14) {
          persistedState = {
            ...persistedState,
            subsidyApplications: deepClone(MockSubsidyApplications),
            subsidyOperationLogs: deepClone(MockSubsidyOperationLogs),
          }
        }
        // 版本 < 15：投诉"投诉方式"改为"投诉来源"（枚举调整为 12345热线/全国文化市场技术监督与服务平台/
        // 省级电话投诉/来信来访），文库资料新增"是否向涉旅企业公开"字段，重置投诉与文库数据
        if (version < 15) {
          persistedState = {
            ...persistedState,
            complaints: deepClone(MockComplaints),
            trainingMaterials: deepClone(MockTrainingMaterials),
          }
        }
        // 版本 < 16：补贴申报新增"行程信息"（按日记录景区/酒店，拉取自团信息），重置补贴申报数据
        if (version < 16) {
          persistedState = {
            ...persistedState,
            subsidyApplications: deepClone(MockSubsidyApplications),
            subsidyOperationLogs: deepClone(MockSubsidyOperationLogs),
          }
        }
        // 版本 < 17：投诉报表模板固化（去章节配置）、"核心指标"更名"投诉总量"、转办交叉表改按九市州统计，
        // 问题分析章保留（仅去 AI 归因占位文字），重置报表/模板/归档日志
        if (version < 17) {
          persistedState = {
            ...persistedState,
            complaintReports: deepClone(MockComplaintReports),
            complaintReportTemplates: deepClone(MockComplaintReportTemplates),
            complaintReportArchiveLogs: deepClone(MockComplaintReportArchiveLogs),
          }
        }
        // 版本 < 18：问题分析章恢复为默认章节（此前版本曾误移除），重置报表数据
        if (version < 18) {
          persistedState = {
            ...persistedState,
            complaintReports: deepClone(MockComplaintReports),
            complaintReportTemplates: deepClone(MockComplaintReportTemplates),
            complaintReportArchiveLogs: deepClone(MockComplaintReportArchiveLogs),
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
        // 投诉数据报表
        complaintReports: state.complaintReports,
        complaintReportTemplates: state.complaintReportTemplates,
        complaintReportArchiveLogs: state.complaintReportArchiveLogs,
        // 旅游包车智慧监管
        coachRegionLevel: state.coachRegionLevel,
        vehicles: state.vehicles,
        tracks: state.tracks,
        videoChannels: state.videoChannels,
        videoClips: state.videoClips,
        transcripts: state.transcripts,
        riskRules: state.riskRules,
        riskEvents: state.riskEvents,
        evidenceChains: state.evidenceChains,
        coachMonitorLogs: state.coachMonitorLogs,
        // 学习培训管理
        trainingCategories: state.trainingCategories,
        trainingMaterials: state.trainingMaterials,
        // 公告发布管理
        announcementCategories: state.announcementCategories,
        announcements: state.announcements,
        announcementReads: state.announcementReads,
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
