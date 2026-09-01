import dayjs from 'dayjs'
import {
  ComplaintMethodLabels,
  TourismCategoryLabels,
  ComplaintStatusLabels,
  type Complaint,
  type ComplaintMethod,
  type ComplaintStatus,
  type TourismCategory,
  type ComplaintReportSnapshot,
} from '../types'

// 投诉内容高频关键词词典（用于共性问题提炼，V1.3）
const COMPLAINT_KEYWORDS = [
  '强制消费', '强制购物', '价格虚高', '价格未公示', '乱收费', '退款', '退差价',
  '服务态度', '卫生', '异味', '污渍', '安全', '超载', '虚假宣传', '变更行程',
  '自费项目', '拒绝退款', '排队', '拥堵', '限流', '导游', '景区', '酒店', '民宿',
  '旅行社', '停车', '强制拍照',
]

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// 格式化金额
export function formatMoney(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// 生成ID
export function genId(prefix = 'APP'): string {
  const now = new Date()
  const y = now.getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${prefix}${y}${random}`
}

// 格式化日期时间
export function nowStr(): string {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 手机号脱敏：保留前3位和后4位，如 138****5678
export function maskPhone(phone?: string): string {
  if (!phone) return ''
  if (phone.length >= 7) return `${phone.slice(0, 3)}****${phone.slice(-4)}`
  return phone.length > 0 ? `${phone.slice(0, 1)}****` : ''
}

// 证件号脱敏：保留前3位和后4位，如 E12****6789
export function maskIdNumber(idNumber?: string): string {
  if (!idNumber) return ''
  if (idNumber.length >= 8) return `${idNumber.slice(0, 3)}****${idNumber.slice(-4)}`
  return idNumber.length > 0 ? `${idNumber.slice(0, 1)}****` : ''
}

// 计算投诉报表快照（基于给定投诉列表与时间范围/区域筛选）
// 复用 ComplaintDashboard 的统计口径，保证报表与看板数据一致
// V1.3：新增研判分析扩展（关键词/环比/风险等级/典型案例），全部在风险研判段呈现（舆情关联预警已移除）
export function buildComplaintReportSnapshot(
  complaints: Complaint[],
  periodStart: string,
  periodEnd: string,
  scopeName: string, // '全省' 或具体市州名
): ComplaintReportSnapshot {
  const start = dayjs(periodStart)
  const end = dayjs(periodEnd)
  const filtered = complaints.filter((c) => {
    if (scopeName && scopeName !== '全省' && c.city !== scopeName) return false
    const t = dayjs(c.complaintTime)
    return !t.isBefore(start.startOf('day')) && !t.isAfter(end.endOf('day'))
  })

  const total = filtered.length
  const pending = filtered.filter((c) => ['pending', 'processing', 'reviewing'].includes(c.status)).length
  const closedCount = filtered.filter((c) => c.status === 'closed').length
  const closedRate = total > 0 ? (closedCount / total) * 100 : 0

  // 方式分布
  const methodMap = new Map<ComplaintMethod, number>()
  Object.keys(ComplaintMethodLabels).forEach((k) => methodMap.set(k as ComplaintMethod, 0))
  filtered.forEach((c) => methodMap.set(c.complaintMethod, (methodMap.get(c.complaintMethod) || 0) + 1))
  const methodStats = Array.from(methodMap.entries())
    .map(([k, v]) => ({ method: k, label: ComplaintMethodLabels[k], count: v }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)

  // 类别分布
  const categoryMap = new Map<TourismCategory, number>()
  Object.keys(TourismCategoryLabels).forEach((k) => categoryMap.set(k as TourismCategory, 0))
  filtered.forEach((c) => categoryMap.set(c.tourismCategory, (categoryMap.get(c.tourismCategory) || 0) + 1))
  const categoryStats = Array.from(categoryMap.entries())
    .map(([k, v]) => ({ category: k, label: TourismCategoryLabels[k], count: v }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)

  // 区域分布
  const regionMap = new Map<string, number>()
  filtered.forEach((c) => {
    const n = c.city || '未知'
    regionMap.set(n, (regionMap.get(n) || 0) + 1)
  })
  const regionStats = Array.from(regionMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // 状态分布
  const statusMap = new Map<ComplaintStatus, number>()
  Object.keys(ComplaintStatusLabels).forEach((k) => statusMap.set(k as ComplaintStatus, 0))
  filtered.forEach((c) => statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1))
  const statusStats = Array.from(statusMap.entries())
    .map(([k, v]) => ({ status: k, label: ComplaintStatusLabels[k], count: v }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)

  // 趋势（按月，最近6个月，以周期结束月为基准）
  const trendStats: { label: string; count: number }[] = []
  const trendEnd = end.isValid() ? end : dayjs()
  for (let i = 5; i >= 0; i--) {
    const m = trendEnd.subtract(i, 'month')
    const key = m.format('YYYY-MM')
    const count = filtered.filter((c) => dayjs(c.complaintTime).format('YYYY-MM') === key).length
    trendStats.push({ label: m.format('YYYY-MM'), count })
  }

  // 高发被投诉人 Top10
  const respMap = new Map<string, { name: string; count: number; lastComplaintTime: string }>()
  filtered.forEach((c) => {
    const name = c.respondent?.name || '未知'
    if (!respMap.has(name)) respMap.set(name, { name, count: 0, lastComplaintTime: '' })
    const s = respMap.get(name)!
    s.count++
    if (!s.lastComplaintTime || c.complaintTime > s.lastComplaintTime) s.lastComplaintTime = c.complaintTime
  })
  const topRespondents = Array.from(respMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 聚类分析：同一区域 + 相同类型的高发组合（V1.2 新增）
  const rcMap = new Map<string, { region: string; categoryLabel: string; count: number }>()
  filtered.forEach((c) => {
    const region = c.city || '未知'
    const categoryLabel = TourismCategoryLabels[c.tourismCategory] || c.tourismCategory
    const key = `${region}|${categoryLabel}`
    if (!rcMap.has(key)) rcMap.set(key, { region, categoryLabel, count: 0 })
    rcMap.get(key)!.count++
  })
  const regionCategoryClusters = Array.from(rcMap.values())
    .filter((r) => r.count >= 2) // 同一区域相同类型投诉 ≥2 件才视为高发组合
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 聚类分析：同一商家重复投诉（含类型分布，V1.2 新增）
  const respClusterMap = new Map<string, { name: string; count: number; categories: Set<string>; lastComplaintTime: string }>()
  filtered.forEach((c) => {
    const name = c.respondent?.name || '未知'
    const categoryLabel = TourismCategoryLabels[c.tourismCategory] || c.tourismCategory
    if (!respClusterMap.has(name)) {
      respClusterMap.set(name, { name, count: 0, categories: new Set(), lastComplaintTime: '' })
    }
    const s = respClusterMap.get(name)!
    s.count++
    s.categories.add(categoryLabel)
    if (!s.lastComplaintTime || c.complaintTime > s.lastComplaintTime) s.lastComplaintTime = c.complaintTime
  })
  const respondentClusters = Array.from(respClusterMap.values())
    .filter((r) => r.count >= 2) // 重复投诉 ≥2 次的商家
    .map((r) => ({ name: r.name, count: r.count, categories: Array.from(r.categories), lastComplaintTime: r.lastComplaintTime }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 办理质量
  const transferredCount = filtered.filter((c) => c.isTransferredToCase).length
  const handleDays: number[] = []
  filtered.forEach((c) => {
    if (c.status === 'closed' && c.replyTime && c.complaintTime) {
      const d = dayjs(c.replyTime).diff(dayjs(c.complaintTime), 'day')
      if (d >= 0) handleDays.push(d)
    }
  })
  const avgHandleDays = handleDays.length > 0 ? handleDays.reduce((s, n) => s + n, 0) / handleDays.length : 0

  // V1.3 研判分析扩展 =====
  // ① 共性问题提炼：投诉内容高频关键词统计
  const keywordMap = new Map<string, number>()
  filtered.forEach((c) => {
    const text = c.content || ''
    COMPLAINT_KEYWORDS.forEach((kw) => {
      if (text.includes(kw)) keywordMap.set(kw, (keywordMap.get(kw) || 0) + 1)
    })
  })
  const keywordStats = Array.from(keywordMap.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .filter((k) => k.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ② 趋势研判：环比变化率（与上一等长周期对比）
  const periodDays = Math.max(1, end.diff(start, 'day') + 1)
  const prevEnd = start.subtract(1, 'day')
  const prevStart = prevEnd.subtract(periodDays - 1, 'day')
  const prevPeriodCount = complaints.filter((c) => {
    if (scopeName && scopeName !== '全省' && c.city !== scopeName) return false
    const t = dayjs(c.complaintTime)
    return !t.isBefore(prevStart.startOf('day')) && !t.isAfter(prevEnd.endOf('day'))
  }).length
  const momRate = prevPeriodCount === 0 ? 0 : ((total - prevPeriodCount) / prevPeriodCount) * 100

  // ③ 风险等级评定：基于重复投诉次数 + 诉转案
  const riskGrading = respondentClusters
    .map((r) => {
      const hasTransferred = filtered.some((c) => c.respondent?.name === r.name && c.isTransferredToCase)
      let level: 'red' | 'orange' | 'yellow'
      let reason: string
      if (r.count >= 4 || (r.count >= 3 && hasTransferred)) {
        level = 'red'
        reason = `重复投诉${r.count}次${hasTransferred ? '且涉及诉转案' : ''}，存在系统性违规`
      } else if (r.count >= 3) {
        level = 'orange'
        reason = `重复投诉${r.count}次，违规惯性明显`
      } else {
        level = 'yellow'
        reason = `重复投诉${r.count}次，需关注`
      }
      return { name: r.name, level, count: r.count, reason }
    })
    .sort((a, b) => {
      const order = { red: 3, orange: 2, yellow: 1 }
      return order[b.level] - order[a.level] || b.count - a.count
    })

  // ④ 典型案例：优先选取诉转案 / 重复商家 / 状态异常的代表性投诉
  const typicalCases = filtered
    .filter((c) => c.isTransferredToCase || respondentClusters.some((r) => r.name === c.respondent?.name))
    .slice(0, 3)
    .map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content || '',
      reason: c.isTransferredToCase
        ? '诉转案线索，涉嫌违法'
        : '同一商家重复投诉，反映系统性问题',
    }))

  // ⑤ 移送问题线索明细（转立案投诉，V1.4 参照线索移送统计分析口径）
  // V1.6：补充区域（县级优先）、移送或涉及部门、线索主题三个维度，供"投诉转办情况"章交叉统计
  const inferTransferDept = (c: Complaint): string => {
    if (c.transferDepartment) return c.transferDepartment
    const text = `${c.suspectedIssue || ''}${c.content || ''}`
    if (/价格|明码标价|收费|消费|商品|购物/.test(text)) return '市场监管部门'
    if (/交通|客运|包车|超载|运输/.test(text)) return '交通运输执法部门'
    if (/公安|治安|驾驶|执照|牌照/.test(text)) return '公安机关'
    if (/纪检|监察|失职|监管责任/.test(text)) return '纪检监察机关'
    return '其他/未注明'
  }
  const inferTransferTheme = (c: Complaint): string => {
    if (c.transferTheme) return c.transferTheme
    const text = `${c.suspectedIssue || ''}${c.content || ''}`
    if (/价格|明码标价|收费|消费|购物|商品/.test(text)) return '价格秩序及商品经营'
    if (/交通|客运|包车|超载|运输/.test(text)) return '旅游交通客运'
    if (/旅行社|网点|资质|经营范围/.test(text)) return '旅行社资质及经营规范'
    if (/安全|飞行|驾驶|牌照|超载/.test(text)) return '安全管理及飞行资质'
    if (/资金|项目/.test(text)) return '项目资金管理'
    return '其他/未注明'
  }
  const transferredCases = filtered
    .filter((c) => c.isTransferredToCase)
    .map((c) => ({
      id: c.id,
      respondentName: c.respondent?.name || '未知',
      complaintTime: c.complaintTime,
      suspectedIssue: c.suspectedIssue || '涉嫌违法违规（未注明具体问题）',
      statusLabel: ComplaintStatusLabels[c.status] || c.status,
      region: c.district || c.city || '未知',
      department: inferTransferDept(c),
      theme: inferTransferTheme(c),
    }))

  // ⑥ 被投诉对象类别 × 高频问题关键词交叉统计（V1.4 问题性质分析章；V1.5 按类别分组渲染组内占比）
  const catKwMap = new Map<string, { categoryLabel: string; keyword: string; count: number }>()
  filtered.forEach((c) => {
    const categoryLabel = TourismCategoryLabels[c.tourismCategory] || c.tourismCategory
    const text = c.content || ''
    COMPLAINT_KEYWORDS.forEach((kw) => {
      if (!text.includes(kw)) return
      const key = `${categoryLabel}|${kw}`
      if (!catKwMap.has(key)) catKwMap.set(key, { categoryLabel, keyword: kw, count: 0 })
      catKwMap.get(key)!.count++
    })
  })
  const categoryKeywordStats = Array.from(catKwMap.values()).sort((a, b) => b.count - a.count)

  return {
    total,
    pending,
    closedCount,
    closedRate,
    methodStats,
    categoryStats,
    regionStats,
    statusStats,
    trendStats,
    topRespondents,
    avgHandleDays,
    transferredCount,
    detailIds: filtered.map((c) => c.id),
    regionCategoryClusters,
    respondentClusters,
    keywordStats,
    prevPeriodCount,
    momRate,
    riskGrading,
    categoryKeywordStats,
    transferredCases,
    typicalCases,
  }
}

// V1.4：按统计周期生成公文式报表标题
// 整月 → "2026年8月贵州省旅游投诉受处工作情况"
// 跨日 → "8月15日至8月21日贵阳市旅游投诉受处工作情况"
// 单日 → "8月26日贵州省旅游投诉受处工作情况"
export function buildReportTitle(periodStart: string, periodEnd: string, scopeName: string): string {
  const start = dayjs(periodStart)
  const end = dayjs(periodEnd)
  const scopePrefix = scopeName === '全省' ? '贵州省' : scopeName
  const isWholeMonth =
    start.date() === 1 && end.date() === end.daysInMonth() && start.format('YYYY-MM') === end.format('YYYY-MM')
  const sameDay = start.isSame(end, 'day')
  let periodText: string
  if (isWholeMonth) {
    periodText = `${start.year()}年${start.month() + 1}月`
  } else if (sameDay) {
    periodText = `${start.month() + 1}月${start.date()}日`
  } else if (start.year() === end.year()) {
    periodText = `${start.month() + 1}月${start.date()}日至${end.month() + 1}月${end.date()}日`
  } else {
    periodText = `${start.year()}年${start.month() + 1}月${start.date()}日至${end.year()}年${end.month() + 1}月${end.date()}日`
  }
  return `${periodText}${scopePrefix}旅游投诉受处工作情况`
}

// 生成报表摘要文案（列表页第二行展示）
export function buildReportSummary(snapshot: ComplaintReportSnapshot, scopeName: string): string {
  if (snapshot.total === 0) {
    return `${scopeName}本期无投诉数据`
  }
  const top = snapshot.categoryStats[0]?.label || '-'
  const repeatCount = snapshot.respondentClusters.length
  if (repeatCount > 0) {
    const topMerchant = snapshot.respondentClusters[0]
    return `本期${scopeName}投诉${snapshot.total}件，高发类别：${top}；重复投诉商家${repeatCount}家（重点：${topMerchant.name} ${topMerchant.count}次）`
  }
  return `本期${scopeName}投诉${snapshot.total}件，高发类别：${top}`
}
