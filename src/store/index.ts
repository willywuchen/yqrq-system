import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Application, Attachment, Message, UserRole } from '../types'
import { MockApplications, MockMessages } from '../mock/data'

// 演示数据快照（用于恢复演示数据）
const DEMO_SNAPSHOT = {
  applications: [...MockApplications],
  messages: [...MockMessages],
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
      resetAllData: () =>
        set({
          applications: [],
          messages: [],
          enterpriseProfile: {
            orgName: '贵州阳光国际旅行社',
          },
        }),

      // 恢复演示数据
      restoreDemoData: () =>
        set({
          applications: [...DEMO_SNAPSHOT.applications],
          messages: [...DEMO_SNAPSHOT.messages],
        }),
    }),
    {
      name: 'yqrq-store',
      // 仅持久化数据字段，不持久化方法
      partialize: (state) => ({
        applications: state.applications,
        messages: state.messages,
        enterpriseProfile: state.enterpriseProfile,
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
