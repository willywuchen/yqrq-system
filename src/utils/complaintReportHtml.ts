import {
  ComplaintReportTypeLabels,
  ComplaintReportScopeLabels,
  ComplaintMethodLabels,
  TourismCategoryLabels,
  ComplaintStatusLabels,
  type ComplaintReport,
  type ComplaintReportSnapshot,
  type Complaint,
} from '../types'

// V1.3 容错归一化：旧版本持久化数据可能缺少新增字段，补默认值避免渲染崩溃
// （HMR 推送新代码但未触发 persist 迁移时，snapshot 可能是旧结构）
function normalizeSnapshot(s: any): ComplaintReportSnapshot {
  return {
    total: s?.total ?? 0,
    pending: s?.pending ?? 0,
    closedCount: s?.closedCount ?? 0,
    closedRate: s?.closedRate ?? 0,
    methodStats: s?.methodStats ?? [],
    categoryStats: s?.categoryStats ?? [],
    regionStats: s?.regionStats ?? [],
    statusStats: s?.statusStats ?? [],
    trendStats: s?.trendStats ?? [],
    topRespondents: s?.topRespondents ?? [],
    avgHandleDays: s?.avgHandleDays ?? 0,
    transferredCount: s?.transferredCount ?? 0,
    detailIds: s?.detailIds ?? [],
    regionCategoryClusters: s?.regionCategoryClusters ?? [],
    respondentClusters: s?.respondentClusters ?? [],
    keywordStats: s?.keywordStats ?? [],
    prevPeriodCount: s?.prevPeriodCount ?? 0,
    momRate: s?.momRate ?? 0,
    riskGrading: s?.riskGrading ?? [],
    typicalCases: s?.typicalCases ?? [],
  }
}

// 生成横条图 HTML（用于方式/类别/区域/状态分布）
function barList(
  items: { label: string; count: number }[],
  color = '#1677ff',
): string {
  if (items.length === 0) {
    return '<div style="color:#999;text-align:center;padding:12px">无数据</div>'
  }
  const max = Math.max(1, ...items.map((i) => i.count))
  const rows = items
    .map(
      (i) => `<tr>
      <td style="width:30%;padding:6px 8px;border:1px solid #e8e8e8">${i.label}</td>
      <td style="padding:6px 8px;border:1px solid #e8e8e8"><div style="background:${color};height:16px;width:${(i.count / max) * 100}%;min-width:2px;border-radius:3px"></div></td>
      <td style="width:60px;text-align:right;padding:6px 8px;border:1px solid #e8e8e8;font-weight:600">${i.count}</td>
    </tr>`,
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse">${rows}</table>`
}

// 趋势 SVG 折线图
function trendSvg(data: { label: string; count: number }[]): string {
  if (data.length === 0) {
    return '<div style="color:#999;text-align:center;padding:12px">无数据</div>'
  }
  const max = Math.max(1, ...data.map((d) => d.count))
  const w = 560,
    h = 180,
    p = { t: 16, r: 16, b: 28, l: 36 }
  const cw = w - p.l - p.r,
    ch = h - p.t - p.b
  const pts = data.map((d, i) => {
    const x = p.l + (data.length > 1 ? (i / (data.length - 1)) * cw : cw / 2)
    const y = p.t + ch - (d.count / max) * ch
    return { x, y, ...d }
  })
  const pathD = pts.map((pt) => `${pts.indexOf(pt) === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
  const last = pts[pts.length - 1]
  const first = pts[0]
  const areaD = ` ${pathD} L ${last.x} ${p.t + ch} L ${first.x} ${p.t + ch} Z`
  const dots = pts
    .map(
      (pt) =>
        `<circle cx="${pt.x}" cy="${pt.y}" r="3" fill="#fff" stroke="#1677ff" stroke-width="2"/><text x="${pt.x}" y="${pt.y - 8}" text-anchor="middle" font-size="10" fill="#333" font-weight="600">${pt.count}</text>`,
    )
    .join('')
  const xlabels = pts
    .map((pt) => `<text x="${pt.x}" y="${h - 8}" text-anchor="middle" font-size="10" fill="#999">${pt.label}</text>`)
    .join('')
  const grid = [0, 0.5, 1]
    .map((r) => {
      const y = p.t + ch * r
      return `<line x1="${p.l}" y1="${y}" x2="${w - p.r}" y2="${y}" stroke="#f0f0f0"/>`
    })
    .join('')
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:180px">${grid}<path d="${areaD}" fill="rgba(22,119,255,0.1)"/><path d="${pathD}" fill="none" stroke="#1677ff" stroke-width="2"/>${dots}${xlabels}</svg>`
}

function sectionHtml(id: string, title: string, body: string): string {
  return `<h2 id="${id}" style="font-size:15px;font-family:'SimHei','黑体',sans-serif;margin:20px 0 8px;border-left:4px solid #1677ff;padding-left:8px">${title}</h2><div style="margin-bottom:12px">${body}</div>`
}

function coreMetricsHtml(s: ComplaintReportSnapshot): string {
  // V1.2：弱化办结率，第三卡换为"重复投诉商家数"（更具指引价值）
  const repeatMerchantCount = s.respondentClusters.length
  const topRegionName = s.regionStats[0]?.name || '-'
  return `<div style="display:flex;gap:12px">
    <div style="flex:1;background:#f0f5ff;border:1px solid #adc6ff;border-radius:6px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#1677ff">${s.total}</div><div style="color:#666;margin-top:4px">投诉总量</div></div>
    <div style="flex:1;background:#fff7e6;border:1px solid #ffd591;border-radius:6px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#fa8c16">${repeatMerchantCount}</div><div style="color:#666;margin-top:4px">重复投诉商家数</div></div>
    <div style="flex:1;background:#f6ffed;border:1px solid #b7eb8f;border-radius:6px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#52c41a">${s.pending}</div><div style="color:#666;margin-top:4px">待办件数</div></div>
  </div>
  <div style="margin-top:8px;color:#666;font-size:11px">高发区域：${topRegionName} ｜ 办结率 ${s.closedRate.toFixed(1)}%（仅作参考，不再作核心考核指标）</div>`
}

function topRespondentsHtml(s: ComplaintReportSnapshot): string {
  if (s.topRespondents.length === 0) {
    return '<div style="color:#999;text-align:center;padding:12px">无数据</div>'
  }
  const rows = s.topRespondents
    .map(
      (r, i) =>
        `<tr><td style="text-align:center;border:1px solid #e8e8e8;padding:6px">${i + 1}</td><td style="border:1px solid #e8e8e8;padding:6px">${r.name}</td><td style="text-align:center;border:1px solid #e8e8e8;padding:6px">${r.count}</td><td style="border:1px solid #e8e8e8;padding:6px">${r.lastComplaintTime || '-'}</td></tr>`,
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="width:8%;border:1px solid #d9d9d9;padding:6px;background:#fafafa">排名</th><th style="border:1px solid #d9d9d9;padding:6px;background:#fafafa">被投诉人/单位</th><th style="width:15%;border:1px solid #d9d9d9;padding:6px;background:#fafafa">投诉次数</th><th style="width:25%;border:1px solid #d9d9d9;padding:6px;background:#fafafa">最近投诉时间</th></tr></thead><tbody>${rows}</tbody></table>`
}

function qualityHtml(s: ComplaintReportSnapshot): string {
  return `<table style="width:100%;border-collapse:collapse"><tbody>
    <tr><td style="width:30%;background:#fafafa;border:1px solid #e8e8e8;padding:8px;font-weight:600">平均办理时长</td><td style="border:1px solid #e8e8e8;padding:8px">${s.avgHandleDays.toFixed(1)} 天</td></tr>
    <tr><td style="background:#fafafa;border:1px solid #e8e8e8;padding:8px;font-weight:600">转立案数</td><td style="border:1px solid #e8e8e8;padding:8px">${s.transferredCount} 件</td></tr>
    <tr><td style="background:#fafafa;border:1px solid #e8e8e8;padding:8px;font-weight:600">已办结</td><td style="border:1px solid #e8e8e8;padding:8px">${s.closedCount} 件</td></tr>
  </tbody></table>`
}

// V1.3 风险研判段：将所有研判分析收敛于此（不再单独列章），便于扩展
// 结构 = 规则计算分析块（始终可用） + AI 归因结论（二期，mock 已模拟）
function aiInsightHtml(report: ComplaintReport): string {
  const s = report.snapshot
  const blocks: string[] = []

  // 块①：风险热点识别（区域×类型 + 同一商家重复投诉）
  const rcRows = s.regionCategoryClusters.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#999;padding:8px">本期无区域×类型高发组合（≥2件）</td></tr>'
    : s.regionCategoryClusters
        .map((r, i) => `<tr><td style="text-align:center;border:1px solid #e8e8e8;padding:4px">${i + 1}</td><td style="border:1px solid #e8e8e8;padding:4px">${r.region}</td><td style="border:1px solid #e8e8e8;padding:4px">${r.categoryLabel}</td><td style="text-align:center;border:1px solid #e8e8e8;padding:4px;font-weight:600;color:#fa541c">${r.count}</td></tr>`)
        .join('')
  const respRows = s.respondentClusters.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#999;padding:8px">无同一商家重复投诉（≥2次）</td></tr>'
    : s.respondentClusters
        .map((r, i) => `<tr><td style="text-align:center;border:1px solid #e8e8e8;padding:4px">${i + 1}</td><td style="border:1px solid #e8e8e8;padding:4px">${r.name}</td><td style="text-align:center;border:1px solid #e8e8e8;padding:4px;font-weight:600;color:#d4380d">${r.count}</td><td style="border:1px solid #e8e8e8;padding:4px;font-size:11px">${r.categories.join('、')}</td></tr>`)
        .join('')
  blocks.push(`<div style="font-weight:600;margin:6px 0 4px">① 风险热点识别</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:6px"><thead><tr><th style="width:6%;border:1px solid #d9d9d9;padding:4px;background:#fafafa">#</th><th style="border:1px solid #d9d9d9;padding:4px;background:#fafafa">区域</th><th style="border:1px solid #d9d9d9;padding:4px;background:#fafafa">类型</th><th style="width:12%;border:1px solid #d9d9d9;padding:4px;background:#fafafa">件数</th></tr></thead><tbody>${rcRows}</tbody></table>
    <table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th style="width:6%;border:1px solid #d9d9d9;padding:4px;background:#fafafa">#</th><th style="border:1px solid #d9d9d9;padding:4px;background:#fafafa">被投诉商家</th><th style="width:10%;border:1px solid #d9d9d9;padding:4px;background:#fafafa">次数</th><th style="border:1px solid #d9d9d9;padding:4px;background:#fafafa">涉及类别</th></tr></thead><tbody>${respRows}</tbody></table>`)

  // 块②：共性问题提炼（高频关键词）
  const kwItems = s.keywordStats.map((k) => ({ label: k.keyword, count: k.count }))
  blocks.push(`<div style="font-weight:600;margin:10px 0 4px">② 共性问题提炼（投诉内容高频关键词）</div>${barList(kwItems, '#722ed1')}`)

  // 块③：趋势研判（环比）
  const momText = s.prevPeriodCount === 0
    ? `本期 ${s.total} 件（上期无数据，环比不可比）`
    : `本期 ${s.total} 件，上期 ${s.prevPeriodCount} 件，环比 ${s.momRate >= 0 ? '上升' : '下降'} ${Math.abs(s.momRate).toFixed(1)}%`
  const momColor = s.momRate > 0 ? '#d4380d' : s.momRate < 0 ? '#52c41a' : '#666'
  blocks.push(`<div style="font-weight:600;margin:10px 0 4px">③ 趋势研判（环比）</div><div style="padding:6px 10px;background:#fafafa;border-left:3px solid ${momColor}"> ${momText}</div>`)

  // 块④：风险等级评定（红/橙/黄）
  const levelLabels = { red: '红色', orange: '橙色', yellow: '黄色' }
  const levelColors = { red: '#d4380d', orange: '#fa8c16', yellow: '#faad14' }
  const gradeRows = s.riskGrading.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#999;padding:8px">本期无可评定风险的重复投诉商家</td></tr>'
    : s.riskGrading
        .map((r) => `<tr><td style="border:1px solid #e8e8e8;padding:4px">${r.name}</td><td style="text-align:center;border:1px solid #e8e8e8;padding:4px"><span style="color:#fff;background:${levelColors[r.level]};padding:1px 6px;border-radius:3px;font-size:11px">${levelLabels[r.level]}</span></td><td style="text-align:center;border:1px solid #e8e8e8;padding:4px">${r.count}</td><td style="border:1px solid #e8e8e8;padding:4px;font-size:11px">${r.reason}</td></tr>`)
        .join('')
  blocks.push(`<div style="font-weight:600;margin:10px 0 4px">④ 风险等级评定（商家）</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th style="border:1px solid #d9d9d9;padding:4px;background:#fafafa">商家</th><th style="width:10%;border:1px solid #d9d9d9;padding:4px;background:#fafafa">等级</th><th style="width:10%;border:1px solid #d9d9d9;padding:4px;background:#fafafa">次数</th><th style="border:1px solid #d9d9d9;padding:4px;background:#fafafa">研判依据</th></tr></thead><tbody>${gradeRows}</tbody></table>`)

  // 块⑤：典型案例
  const caseRows = s.typicalCases.length === 0
    ? '<tr><td colspan="3" style="text-align:center;color:#999;padding:8px">本期无典型案例</td></tr>'
    : s.typicalCases
        .map((c) => `<tr><td style="border:1px solid #e8e8e8;padding:4px;white-space:nowrap">${c.id}</td><td style="border:1px solid #e8e8e8;padding:4px">${c.title}<div style="color:#999;font-size:10px;margin-top:2px">${(c.content || '').slice(0, 60)}…</div></td><td style="border:1px solid #e8e8e8;padding:4px;font-size:11px;color:#d4380d;white-space:nowrap">${c.reason}</td></tr>`)
        .join('')
  blocks.push(`<div style="font-weight:600;margin:10px 0 4px">⑤ 典型案例</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th style="width:14%;border:1px solid #d9d9d9;padding:4px;background:#fafafa">编号</th><th style="border:1px solid #d9d9d9;padding:4px;background:#fafafa">标题与内容摘要</th><th style="width:20%;border:1px solid #d9d9d9;padding:4px;background:#fafafa">入选原因</th></tr></thead><tbody>${caseRows}</tbody></table>`)

  // 块⑥：AI 归因结论（二期，mock 已模拟）
  let aiBlock = ''
  if (report.hasAiInsight && report.aiInsight) {
    aiBlock = `<div style="font-weight:600;margin:10px 0 4px">⑥ AI 归因结论（二期）</div><div style="background:#f6ffed;border:1px solid #b7eb8f;padding:10px;border-radius:4px;line-height:1.8">${report.aiInsight}</div>`
  } else {
    aiBlock = `<div style="font-weight:600;margin:10px 0 4px">⑥ AI 归因结论</div><div style="color:#999;padding:6px">AI 文本归因二期上线后自动生成（可人工编辑后定稿）</div>`
  }

  return `<div style="color:#666;font-size:10px;margin-bottom:4px">说明：以下 ①-⑤ 为规则计算分析（数据驱动，始终可用），⑥ 为 AI 文本归因（二期，可编辑）。</div>
    ${blocks.join('')}${aiBlock}
    <div style="color:#999;font-size:10px;margin-top:6px">⚠ ⑥ 为模拟内容，二期上线后由模型实时生成</div>`
}

function buildOverviewText(report: ComplaintReport): string {
  const s = normalizeSnapshot(report.snapshot)
  const periodLabel = report.reportType === 'low_season_month'
    ? '本月'
    : report.reportType === 'peak_week'
      ? '本周'
      : '当日'
  const scope = report.scopeName
  if (s.total === 0) {
    return `${periodLabel}${scope}统计范围内无投诉数据，市场整体运行平稳。`
  }
  // V1.2：弱化办结率表述，强化聚类结论
  const topCategory = s.categoryStats[0]?.label || '-'
  const topRegion = s.regionStats[0]?.name || '-'
  const repeatMerchantCount = s.respondentClusters.length
  const topMerchant = s.respondentClusters[0]
  const parts = [`${periodLabel}${scope}共受理旅游投诉 ${s.total} 件，其中待办 ${s.pending} 件。从类别看，${topCategory} 类投诉最为集中；从区域看，${topRegion} 投诉量居前。`]
  if (repeatMerchantCount > 0 && topMerchant) {
    parts.push(`经聚类分析，本期存在 ${repeatMerchantCount} 家商家被重复投诉，其中"${topMerchant.name}"被投诉 ${topMerchant.count} 次（涉及${topMerchant.categories.join('、')}），建议作为下一步监管重点。`)
  } else {
    parts.push(`本期未发现同一商家重复投诉，市场秩序总体平稳。`)
  }
  return parts.join('')
}

function buildAdviceText(report: ComplaintReport): string {
  const s = normalizeSnapshot(report.snapshot)
  if (s.total === 0) {
    return '本周期无投诉，建议继续保持现有监管力度，加强节假日应急值守。'
  }
  // V1.2：以聚类数据驱动建议，给出可执行指引（约谈谁、关注哪个区域哪类）
  const advice: string[] = []
  // 1. 同一商家重复投诉 → 约谈/专项检查指引
  s.respondentClusters.slice(0, 3).forEach((r) => {
    advice.push(`约谈/专项检查"${r.name}"：本期被投诉 ${r.count} 次，涉及${r.categories.join('、')}，最近投诉时间 ${r.lastComplaintTime || '-'}，建议下发整改通知并跟踪复查。`)
  })
  // 2. 区域×类型高发组合 → 联合执法/重点巡查指引
  s.regionCategoryClusters.slice(0, 3).forEach((r) => {
    advice.push(`重点巡查 ${r.region} 的 ${r.categoryLabel} 领域：本期同类投诉 ${r.count} 件，建议联合属地文旅、市场监管部门开展专项巡查。`)
  })
  // 3. 转立案线索跟踪
  if (s.transferredCount > 0) {
    advice.push(`跟踪 ${s.transferredCount} 件转立案线索处置进展，涉嫌违法线索已移交综合执法部门，建议定期对接结果反馈。`)
  }
  // 4. 待办清零（弱化为末位提示，不再作核心考核）
  if (s.pending > 0) {
    advice.push(`推进 ${s.pending} 件待办投诉清零，避免节假日前夕积压。`)
  }
  if (advice.length === 0) {
    advice.push('本周期投诉态势平稳，建议继续保持现有监管力度。')
  }
  return advice.map((a, i) => `${i + 1}. ${a}`).join('<br/>')
}

export function buildComplaintReportHtml(report: ComplaintReport): string {
  const s = normalizeSnapshot(report.snapshot)
  const typeLabel = ComplaintReportTypeLabels[report.reportType]
  const scopeLabel = `${ComplaintReportScopeLabels[report.scopeLevel]} · ${report.scopeName}`
  const chapters = (report.chapters || []).filter((c) => c.enabled)

  const anchors = chapters
    .map(
      (c, i) =>
        `<a href="#sec-${i}" style="margin-right:16px;color:#1677ff;text-decoration:none;font-size:12px">${c.title}</a>`,
    )
    .join('')

  const sections = chapters
    .map((c, i) => {
      const id = `sec-${i}`
      switch (c.kind) {
        case 'overview':
          return sectionHtml(id, c.title, `<p style="line-height:1.8;text-indent:2em">${buildOverviewText(report)}</p>`)
        case 'core_metrics':
          return sectionHtml(id, c.title, coreMetricsHtml(s))
        case 'method_pie':
          return sectionHtml(id, c.title, barList(s.methodStats, '#1677ff'))
        case 'category_bar':
          return sectionHtml(id, c.title, barList(s.categoryStats, '#52c41a'))
        case 'region_bar':
          return sectionHtml(
            id,
            c.title,
            barList(
              s.regionStats.map((r) => ({ label: r.name, count: r.count })),
              '#fa8c16',
            ),
          )
        case 'status_donut':
          return sectionHtml(id, c.title, barList(s.statusStats, '#722ed1'))
        case 'trend_line':
          return sectionHtml(id, c.title, trendSvg(s.trendStats))
        case 'top_respondents':
          return sectionHtml(id, c.title, topRespondentsHtml(s))
        case 'quality':
          return sectionHtml(id, c.title, qualityHtml(s))
        case 'ai_insight':
          return sectionHtml(id, c.title, aiInsightHtml(report))
        case 'advice':
          return sectionHtml(id, c.title, `<p style="line-height:1.8">${buildAdviceText(report)}</p>`)
        case 'detail_attach':
          return sectionHtml(
            id,
            c.title,
            `<p style="color:#666">附件：投诉明细 Excel（共 ${s.detailIds.length} 条），请于在线预览页点击"导出 Excel"下载。</p>`,
          )
        default:
          return ''
      }
    })
    .join('')

  const emptyAlert =
    report.status === 'empty'
      ? `<div style="background:#fffbe6;border:1px solid #ffe58f;padding:10px 16px;border-radius:4px;margin-bottom:16px;color:#ad6800">⚠ 本期统计范围内无投诉数据，已生成空报表。</div>`
      : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${report.title}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: 'SimSun', '宋体', serif; font-size: 12px; color: #000; line-height: 1.6; }
  h1 { text-align: center; font-size: 18px; margin: 0 0 8px 0; font-family: 'SimHei', '黑体', sans-serif; }
  .meta { text-align: center; color: #666; font-size: 11px; margin-bottom: 4px; }
  .anchor-nav { background: #fafafa; padding: 8px 12px; border-radius: 4px; margin-bottom: 16px; border: 1px solid #f0f0f0; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e8e8e8; text-align: right; color: #999; font-size: 10px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <h1>${report.title}</h1>
  <div class="meta">报表类型：${typeLabel} ｜ 统计周期：${report.periodStart} 至 ${report.periodEnd} ｜ 数据范围：${scopeLabel}</div>
  <div class="meta">生成时间：${report.generatedAt} ｜ 生成人：${report.generatedBy} ｜ 触发方式：${report.trigger === 'scheduled' ? '定时任务' : '手动生成'}</div>
  ${emptyAlert}
  <div class="anchor-nav no-print">${anchors}</div>
  ${sections}
  <div class="footer">
    <p>报表编号：${report.id} ｜ 本报表为系统自动生成，数据来源：投诉台账</p>
  </div>
  <div class="no-print" style="position:fixed;top:8px;right:8px;">
    <button onclick="window.print()" style="padding:8px 16px;background:#1677ff;color:#fff;border:none;border-radius:4px;cursor:pointer;">打印 / 另存为 PDF</button>
    <button onclick="window.close()" style="padding:8px 16px;background:#999;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-left:8px;">关闭</button>
  </div>
</body>
</html>`
}

// 导出投诉明细 CSV（含统计周期列，V1.1 确认）
export function exportComplaintDetailCsv(report: ComplaintReport, complaints: Complaint[]) {
  const details = complaints.filter((c) => report.snapshot.detailIds.includes(c.id))
  const period = `${report.periodStart} ~ ${report.periodEnd}`
  const header = ['序号', '投诉编号', '投诉时间', '投诉方式', '旅游类别', '投诉人', '联系电话', '省', '市', '县', '被投诉人', '状态', '办结状态', '转立案', '投诉内容', '统计周期']
  const rows = details.map((c, i) => [
    i + 1,
    c.id,
    c.complaintTime,
    ComplaintMethodLabels[c.complaintMethod] || c.complaintMethod,
    TourismCategoryLabels[c.tourismCategory] || c.tourismCategory,
    c.complainant.name,
    c.complainant.phone || '-',
    c.province,
    c.city,
    c.district || '-',
    c.respondent.name,
    ComplaintStatusLabels[c.status] || c.status,
    c.replyStatus,
    c.isTransferredToCase ? '是' : '否',
    (c.content || '').replace(/[\r\n,]/g, ' '),
    period,
  ])
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.title}_投诉明细.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
