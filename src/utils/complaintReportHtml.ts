import {
  ComplaintReportScopeLabels,
  ComplaintMethodLabels,
  TourismCategoryLabels,
  ComplaintStatusLabels,
  ReplyStatusLabels,
  type ComplaintReport,
  type ComplaintReportSnapshot,
  type Complaint,
} from '../types'

// V1.4 容错归一化：旧版本持久化数据可能缺少新增字段，补默认值避免渲染崩溃
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
    categoryKeywordStats: s?.categoryKeywordStats ?? [],
    transferredCases: (s?.transferredCases ?? []).map((c: any) => ({
      id: c?.id ?? '',
      respondentName: c?.respondentName ?? '未知',
      complaintTime: c?.complaintTime ?? '',
      suspectedIssue: c?.suspectedIssue ?? '',
      statusLabel: c?.statusLabel ?? '',
      region: c?.region ?? '未知',
      department: c?.department ?? '其他/未注明',
      theme: c?.theme ?? '其他/未注明',
    })),
    typicalCases: s?.typicalCases ?? [],
  }
}

// 公文式统计表：项目 | 件数 | 占比，含合计行（V1.4 参照公文的分类统计表）
function statTable(
  items: { label: string; count: number }[],
  total: number,
): string {
  if (items.length === 0) {
    return '<div style="color:#999;text-align:center;padding:12px">无数据</div>'
  }
  const pct = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(2)}%` : '-')
  const rows = items
    .map(
      (i) => `<tr>
      <td style="padding:6px 10px;border:1px solid #e8e8e8">${i.label}</td>
      <td style="text-align:center;padding:6px 10px;border:1px solid #e8e8e8">${i.count}</td>
      <td style="text-align:center;padding:6px 10px;border:1px solid #e8e8e8">${pct(i.count)}</td>
    </tr>`,
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th style="width:50%;padding:6px 10px;border:1px solid #d9d9d9;background:#fafafa">项目</th>
      <th style="width:25%;padding:6px 10px;border:1px solid #d9d9d9;background:#fafafa">件数</th>
      <th style="width:25%;padding:6px 10px;border:1px solid #d9d9d9;background:#fafafa">占比</th>
    </tr></thead>
    <tbody>${rows}
      <tr style="font-weight:600;background:#fafafa">
        <td style="padding:6px 10px;border:1px solid #e8e8e8">合计</td>
        <td style="text-align:center;padding:6px 10px;border:1px solid #e8e8e8">${total}</td>
        <td style="text-align:center;padding:6px 10px;border:1px solid #e8e8e8">100%</td>
      </tr>
    </tbody></table>`
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

// ===== V1.6 图表解读（参照《贵州省2025年旅游投诉受处工作情况》：每个图表下附文字解释、总结说明） =====
// 公文式解读段落：首行缩进两字（空文本不渲染）
function chartNote(text: string): string {
  if (!text) return ''
  return `<p style="line-height:1.8;text-indent:2em;margin:10px 0 0">${text}</p>`
}

// 公文式枚举："A 12件，占30.00%；B 5件，占12.50%"
function enumStats(items: { label: string; count: number }[], total: number, max = 4): string {
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(2) : '-')
  return items
    .filter((i) => i.count > 0)
    .slice(0, max)
    .map((i) => `${i.label}${i.count}件，占${pct(i.count)}%`)
    .join('；')
}

function coreMetricsNote(s: ComplaintReportSnapshot): string {
  if (s.total === 0) return '本期统计范围内无投诉数据，各项核心指标均为空，旅游市场整体运行平稳。'
  const repeatMerchantCount = s.respondentClusters.length
  const topRegion = s.regionStats[0]
  return `本期共受理旅游投诉${s.total}件，其中待办${s.pending}件、已办结${s.closedCount}件。${repeatMerchantCount > 0 ? `被重复投诉（≥2次）商家${repeatMerchantCount}家，需重点关注系统性经营问题；` : ''}投诉量最高的区域为${topRegion?.name ?? '-'}。待办量反映本期处置压力，办结率仅作参考指标、不作核心考核。`
}

function methodNote(s: ComplaintReportSnapshot): string {
  if (s.methodStats.length === 0) return '本期无投诉来源数据。'
  const top = s.methodStats[0]
  const topPct = s.total > 0 ? ((top.count / s.total) * 100).toFixed(2) : '-'
  return `从投诉来源来划分。${enumStats(s.methodStats.map((m) => ({ label: m.label, count: m.count })), s.total)}。投诉来源以${top.label}为主，占${topPct}%，是游客反映涉旅问题的主要渠道，建议持续保障该渠道受理与转办时效。`
}

function regionNote(s: ComplaintReportSnapshot): string {
  if (s.regionStats.length === 0) return '本期无行政区域分布数据。'
  const top = s.regionStats[0]
  const topPct = s.total > 0 ? ((top.count / s.total) * 100).toFixed(2) : '-'
  return `从投诉行政区域划分。${enumStats(s.regionStats.map((r) => ({ label: r.name, count: r.count })), s.total, 6)}。${top.name}投诉量居首位，占${topPct}%，主要与其游客接待规模大、涉旅业态密集有关，建议属地部门保持常态化巡查与快速处置。`
}

function categoryNote(s: ComplaintReportSnapshot): string {
  if (s.categoryStats.length === 0) return '本期无被投诉对象分类数据。'
  const top = s.categoryStats[0]
  const topPct = s.total > 0 ? ((top.count / s.total) * 100).toFixed(2) : '-'
  return `从被投诉对象划分。${enumStats(s.categoryStats.map((m) => ({ label: m.label, count: m.count })), s.total)}。针对${top.label}的投诉最为集中，占${topPct}%，反映该业态在履约规范、服务质量等方面仍存在薄弱环节，应作为专项治理重点。`
}

function statusNote(s: ComplaintReportSnapshot): string {
  if (s.statusStats.length === 0) return '本期无处理状态数据。'
  return `从处理状态划分。${enumStats(s.statusStats.map((m) => ({ label: m.label, count: m.count })), s.total)}。本期办结率${s.closedRate.toFixed(1)}%（仅作参考指标），尚有${s.pending}件处于待办状态，请在法定时限内加快办理并做好进度跟踪。`
}

function trendNote(s: ComplaintReportSnapshot): string {
  const data = s.trendStats
  if (data.length === 0 || data.every((d) => d.count === 0)) return '近6个月无投诉数据，市场运行整体平稳。'
  const peak = data.reduce((a, b) => (b.count > a.count ? b : a))
  const low = data.reduce((a, b) => (b.count < a.count ? b : a))
  const avg = (arr: typeof data) => (arr.length ? arr.reduce((sum, d) => sum + d.count, 0) / arr.length : 0)
  const firstHalf = avg(data.slice(0, 3))
  const lastHalf = avg(data.slice(-3))
  const dir = lastHalf > firstHalf * 1.15 ? '波动上升' : lastHalf < firstHalf * 0.85 ? '波动下降' : '基本平稳'
  return `近6个月投诉量整体${dir}。${peak.label}为投诉峰值（${peak.count}件），与旅游旺季游客量集中、涉旅消费纠纷增多相符；${low.label}投诉量最低（${low.count}件）。建议在旺季来临前提前部署值守与应急处置力量。`
}

function problemAnalysisNote(s: ComplaintReportSnapshot): string {
  if (s.categoryKeywordStats.length === 0 && s.topRespondents.length === 0) {
    return '本期未命中高频问题关键词，也无被投诉对象统计数据。'
  }
  const parts: string[] = []
  if (s.categoryKeywordStats.length > 0) {
    const topKw = s.categoryKeywordStats[0]
    parts.push(`从投诉问题性质看，${topKw.categoryLabel}类投诉主要集中于"${topKw.keyword}"等问题`)
  }
  const top5 = s.topRespondents.slice(0, 5)
  if (top5.length > 0) {
    parts.push(`投诉量前五的被投诉对象依次为${top5.map((r, i) => `${i + 1}.${r.name}（${r.count}件）`).join('、')}`)
  }
  return `${parts.join('；')}。被投诉对象集中的问题反映共性短板，建议督促相关经营主体对照整改并跟踪复查。`
}

function topRespondentsNote(s: ComplaintReportSnapshot): string {
  if (s.topRespondents.length === 0) return '本期无被投诉对象统计数据。'
  const top = s.topRespondents[0]
  const sum = s.topRespondents.reduce((acc, r) => acc + r.count, 0)
  const pct = s.total > 0 ? ((sum / s.total) * 100).toFixed(2) : '-'
  return `投诉量排名前十的被投诉对象合计${sum}件，占投诉总量的${pct}%。其中"${top.name}"被投诉${top.count}次居首，最近投诉时间为${top.lastComplaintTime || '-'}，对该类高发对象应列为重点监管名单，必要时开展约谈。`
}

function qualityNote(s: ComplaintReportSnapshot): string {
  return `本期已办结${s.closedCount}件，办结率${s.closedRate.toFixed(1)}%（仅作参考指标，不作核心考核）；平均办理时长${s.avgHandleDays.toFixed(1)}天；转立案${s.transferredCount}件。对临近法定时限的案件应提前预警督办，确保按期办结。`
}

function transferredCasesNote(s: ComplaintReportSnapshot): string {
  if (s.transferredCases.length === 0) return ''
  return `上述移送问题线索已按规定移交有管辖权的部门处置，建议建立台账定期对接处理结果，确保线索件件有着落。`
}

function coreMetricsHtml(s: ComplaintReportSnapshot): string {
  const repeatMerchantCount = s.respondentClusters.length
  const topRegionName = s.regionStats[0]?.name || '-'
  return `<div style="display:flex;gap:12px">
    <div style="flex:1;background:#f0f5ff;border:1px solid #adc6ff;border-radius:6px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#1677ff">${s.total}</div><div style="color:#666;margin-top:4px">投诉总量（件）</div></div>
    <div style="flex:1;background:#fff7e6;border:1px solid #ffd591;border-radius:6px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#fa8c16">${repeatMerchantCount}</div><div style="color:#666;margin-top:4px">重复投诉商家数（家）</div></div>
    <div style="flex:1;background:#f6ffed;border:1px solid #b7eb8f;border-radius:6px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#52c41a">${s.pending}</div><div style="color:#666;margin-top:4px">待办件数（件）</div></div>
  </div>
  <div style="margin-top:8px;color:#666;font-size:11px">高发区域：${topRegionName} ｜ 办结率 ${s.closedRate.toFixed(1)}%（仅作参考，不作核心考核指标）</div>`
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
  return `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="width:8%;border:1px solid #d9d9d9;padding:6px;background:#fafafa">排名</th><th style="border:1px solid #d9d9d9;padding:6px;background:#fafafa">被投诉对象</th><th style="width:15%;border:1px solid #d9d9d9;padding:6px;background:#fafafa">投诉次数</th><th style="width:25%;border:1px solid #d9d9d9;padding:6px;background:#fafafa">最近投诉时间</th></tr></thead><tbody>${rows}</tbody></table>`
}

function qualityHtml(s: ComplaintReportSnapshot): string {
  return `<table style="width:100%;border-collapse:collapse"><tbody>
    <tr><td style="width:30%;background:#fafafa;border:1px solid #e8e8e8;padding:8px;font-weight:600">已办结</td><td style="border:1px solid #e8e8e8;padding:8px">${s.closedCount} 件（办结率 ${s.closedRate.toFixed(1)}%，仅作参考指标）</td></tr>
    <tr><td style="background:#fafafa;border:1px solid #e8e8e8;padding:8px;font-weight:600">平均办理时长</td><td style="border:1px solid #e8e8e8;padding:8px">${s.avgHandleDays.toFixed(1)} 天</td></tr>
    <tr><td style="background:#fafafa;border:1px solid #e8e8e8;padding:8px;font-weight:600">转立案数</td><td style="border:1px solid #e8e8e8;padding:8px">${s.transferredCount} 件</td></tr>
  </tbody></table>`
}

// 从投诉问题性质划分（V1.5：（一）参照公文图三结构——投诉对象类型纵向合并 + 组内占比；（二）投诉量前五被投诉对象）
function problemAnalysisHtml(s: ComplaintReportSnapshot): string {
  // （一）按类别分组：类别按组合计降序，组内按件数降序（每组最多 5 项），占比为组内占比
  const groups = new Map<string, { keyword: string; count: number }[]>()
  s.categoryKeywordStats.forEach((r) => {
    if (!groups.has(r.categoryLabel)) groups.set(r.categoryLabel, [])
    groups.get(r.categoryLabel)!.push({ keyword: r.keyword, count: r.count })
  })
  const groupEntries = Array.from(groups.entries())
    .map(([label, items]) => {
      const sorted = [...items].sort((a, b) => b.count - a.count).slice(0, 5)
      return { label, items: sorted, total: sorted.reduce((sum, i) => sum + i.count, 0) }
    })
    .sort((a, b) => b.total - a.total)
  let crossRows: string
  if (groupEntries.length === 0) {
    crossRows = '<tr><td colspan="4" style="text-align:center;color:#999;padding:8px">本期投诉内容未命中高频问题关键词</td></tr>'
  } else {
    crossRows = groupEntries
      .map((g) =>
        g.items
          .map((it, idx) => `<tr>${idx === 0 ? `<td rowspan="${g.items.length}" style="text-align:center;padding:4px 10px;border:1px solid #e8e8e8;font-weight:600">${g.label}<div style="color:#999;font-weight:400;font-size:10px;margin-top:2px">${g.total}件</div></td>` : ''}<td style="padding:4px 10px;border:1px solid #e8e8e8">${it.keyword}</td><td style="text-align:center;padding:4px 10px;border:1px solid #e8e8e8;font-weight:600">${it.count}</td><td style="text-align:center;padding:4px 10px;border:1px solid #e8e8e8">${g.total > 0 ? ((it.count / g.total) * 100).toFixed(2) : '-'}%</td></tr>`)
          .join(''),
      )
      .join('')
  }
  const top5 = s.topRespondents.slice(0, 5)
  const top5Rows = top5.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#999;padding:8px">无被投诉对象统计数据</td></tr>'
    : top5
        .map((r, i) => `<tr><td style="text-align:center;padding:4px 10px;border:1px solid #e8e8e8">${i + 1}</td><td style="padding:4px 10px;border:1px solid #e8e8e8">${r.name}</td><td style="text-align:center;padding:4px 10px;border:1px solid #e8e8e8;font-weight:600">${r.count}</td><td style="padding:4px 10px;border:1px solid #e8e8e8">${r.lastComplaintTime || '-'}</td></tr>`)
        .join('')
  return `<div style="color:#666;font-size:11px;margin-bottom:6px">（一）被投诉对象类别与主要问题交叉统计</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px"><thead><tr>
      <th style="width:28%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">投诉对象类型</th>
      <th style="border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">投诉问题</th>
      <th style="width:14%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">投诉量（件）</th>
      <th style="width:12%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">占比</th>
    </tr></thead><tbody>${crossRows}</tbody></table>
    <div style="color:#999;font-size:10px;margin:-8px 0 12px">注：占比为该投诉对象类型内部的构成占比。</div>
    <div style="color:#666;font-size:11px;margin-bottom:6px">（二）投诉量前五的被投诉对象</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr>
      <th style="width:8%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">排名</th>
      <th style="border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">被投诉对象</th>
      <th style="width:14%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">投诉量（件）</th>
      <th style="width:18%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">最近投诉时间</th>
    </tr></thead><tbody>${top5Rows}</tbody></table>`
}

// 移送问题线索情况：转立案统计 + 线索明细（V1.4 参照《发现问题及移送线索统计分析》）
function transferredCasesHtml(s: ComplaintReportSnapshot): string {
  if (s.transferredCases.length === 0) {
    return '<p style="line-height:1.8;text-indent:2em">本期统计范围内无移送问题线索（转立案）投诉。</p>'
  }
  const ratio = s.total > 0 ? ((s.transferredCases.length / s.total) * 100).toFixed(2) : '0'
  const rows = s.transferredCases
    .map((c) => `<tr>
      <td style="padding:4px 10px;border:1px solid #e8e8e8;white-space:nowrap">${c.id}</td>
      <td style="padding:4px 10px;border:1px solid #e8e8e8">${c.respondentName}</td>
      <td style="text-align:center;padding:4px 10px;border:1px solid #e8e8e8;white-space:nowrap">${c.complaintTime}</td>
      <td style="padding:4px 10px;border:1px solid #e8e8e8;font-size:11px">${c.suspectedIssue}</td>
      <td style="text-align:center;padding:4px 10px;border:1px solid #e8e8e8;white-space:nowrap">${c.statusLabel}</td>
    </tr>`)
    .join('')
  return `<p style="line-height:1.8;text-indent:2em;margin-bottom:8px">本期移送问题线索（转立案）共 <b>${s.transferredCases.length}</b> 件，占投诉总量的 ${ratio}%。涉及对象及涉嫌问题如下：</p>
    <table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr>
      <th style="width:15%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">投诉编号</th>
      <th style="width:22%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">被投诉对象</th>
      <th style="width:11%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">投诉时间</th>
      <th style="border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">涉嫌问题</th>
      <th style="width:11%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">当前状态</th>
    </tr></thead><tbody>${rows}</tbody></table>`
}

// 投诉转办情况（V1.6 参照附件报告"移送问题线索情况"：移送部门区域交叉统计表 + 分区域文字解读）
// V1.7：按需求移除"（二）按线索主题统计"表，主题仅作为分区域解读中的描述性信息保留
function transferAnalysisHtml(s: ComplaintReportSnapshot): string {
  const cases = s.transferredCases
  if (cases.length === 0) {
    return '<p style="line-height:1.8;text-indent:2em">本期统计范围内无转办、移送问题线索投诉，各渠道诉求均在文旅部门职责范围内受理处置。</p>'
  }
  const total = cases.length
  // 区域列（县级优先），按合计降序
  const regionCount = new Map<string, number>()
  cases.forEach((c) => regionCount.set(c.region, (regionCount.get(c.region) || 0) + 1))
  const regions = Array.from(regionCount.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name)
  // 部门 / 主题 维度统计与区域交叉
  const dimCount: Record<'department' | 'theme', Map<string, number>> = {
    department: new Map(),
    theme: new Map(),
  }
  const cross = new Map<string, number>() // `区域|维度值` -> 条数
  cases.forEach((c) => {
    ;(['department', 'theme'] as const).forEach((key) => {
      dimCount[key].set(c[key], (dimCount[key].get(c[key]) || 0) + 1)
      const k = `${c.region}|${c[key]}`
      cross.set(k, (cross.get(k) || 0) + 1)
    })
  })
  const sortedDim = (key: 'department' | 'theme') =>
    Array.from(dimCount[key].entries()).sort((a, b) => b[1] - a[1])

  const th = 'border:1px solid #d9d9d9;padding:4px 8px;background:#fafafa;font-weight:600'
  const td = 'border:1px solid #e8e8e8;padding:4px 8px'
  const crossTable = (dimLabel: string, key: 'department' | 'theme') => {
    const rows = sortedDim(key)
    const headCells = regions.map((r) => `<th style="${th}">${r}<br/>（条）</th>`).join('')
    const bodyRows = rows
      .map(
        (r) => `<tr>
          <td style="${td}">${r[0]}</td>
          ${regions.map((rg) => `<td style="text-align:center;${td}">${cross.get(`${rg}|${r[0]}`) || 0}</td>`).join('')}
          <td style="text-align:center;${td};font-weight:600">${r[1]}</td>
        </tr>`,
      )
      .join('')
    return `<div style="color:#666;font-size:11px;margin:4px 0 6px">${dimLabel}</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px"><thead><tr>
        <th style="width:${Math.max(18, 46 - regions.length * 4)}%;${th}">${key === 'department' ? '移送或涉及部门' : '线索主题'}</th>
        ${headCells}<th style="${th}">合计（条）</th>
      </tr></thead><tbody>${bodyRows}</tbody></table>`
  }

  // 文字解读：总体 + 部门 + 分区域（参照附件公文写法；主题作为区域解读中的描述信息）
  const join条 = (entries: [string, number][], max = 5) =>
    entries.slice(0, max).map(([name, count]) => `${name}${count}条`).join('、')
  const deptEntries = sortedDim('department')
  const themeEntries = sortedDim('theme')
  const ratio = s.total > 0 ? ((total / s.total) * 100).toFixed(2) : '-'
  const paras: string[] = []
  paras.push(`本期共转办、移送问题线索${total}条，占投诉总量的${ratio}%。按移送或涉及部门看，主要为${join条(deptEntries)}。其中${deptEntries[0][0]}受理线索最多，反映市场监管、消费维权类事项仍是跨部门移送的主要事项。`)
  const regionParas = regions.slice(0, 5).map((rg) => {
    const count = regionCount.get(rg) || 0
    const topTheme = themeEntries
      .filter(([name]) => cases.some((c) => c.region === rg && c.theme === name))
      .sort((a, b) => (cross.get(`${rg}|${b[0]}`) || 0) - (cross.get(`${rg}|${a[0]}`) || 0))[0]
    const topDept = deptEntries
      .filter(([name]) => cases.some((c) => c.region === rg && c.department === name))
      .sort((a, b) => (cross.get(`${rg}|${b[0]}`) || 0) - (cross.get(`${rg}|${a[0]}`) || 0))[0]
    return `${rg}共有移送问题线索${count}条，主要为${topTheme ? `"${topTheme[0]}"类（${cross.get(`${rg}|${topTheme[0]}`) || 0}条）` : '其他事项'}，已按职责移送${topDept ? topDept[0] : '相关部门'}处置。`
  })
  paras.push(...regionParas)

  return `${crossTable('按移送或涉及部门统计', 'department')}${paras.map((p) => `<p style="line-height:1.8;text-indent:2em;margin:0 0 6px">${p}</p>`).join('')}`
}

// 问题分析（V1.4 公文体："一是/二是/三是/四是"特点归纳 + 风险分级 + 典型案例 + AI 归因占位）
function aiInsightHtml(report: ComplaintReport): string {
  const s = normalizeSnapshot(report.snapshot)
  const paras: string[] = []
  const pStyle = 'style="line-height:1.8;text-indent:2em;margin:0 0 8px"'

  // 一是：投诉总量环比变化
  const momText = s.prevPeriodCount === 0
    ? '上期无数据，环比不可比'
    : `较上期（${s.prevPeriodCount} 件）${s.momRate >= 0 ? '上升' : '下降'} ${Math.abs(s.momRate).toFixed(1)}%`
  paras.push(`<p ${pStyle}><b>一是投诉总量环比变化。</b>本期共受理投诉 ${s.total} 件，${momText}。</p>`)

  // 二是：区域×类型高发组合
  if (s.regionCategoryClusters.length > 0) {
    const rc = s.regionCategoryClusters.slice(0, 3).map((r) => `${r.region}${r.categoryLabel}领域（${r.count}件）`).join('、')
    paras.push(`<p ${pStyle}><b>二是部分区域和业态投诉较为集中。</b>本期高发组合为${rc}，反映相关区域业态存在共性问题，建议属地部门开展针对性巡查。</p>`)
  } else {
    paras.push(`<p ${pStyle}><b>二是区域业态分布总体均衡。</b>本期未发现同一区域同类投诉达 2 件及以上的高发组合。</p>`)
  }

  // 三是：同一商家重复投诉 + 风险分级表
  let riskTable = ''
  if (s.respondentClusters.length > 0) {
    const top = s.respondentClusters[0]
    paras.push(`<p ${pStyle}><b>三是同一商家重复投诉问题需关注。</b>本期共有 ${s.respondentClusters.length} 家商家被重复投诉（≥2次），其中"${top.name}"被投诉 ${top.count} 次（涉及${top.categories.join('、')}），疑似存在系统性经营问题，建议作为监管重点。</p>`)
    const levelLabels = { red: '红色', orange: '橙色', yellow: '黄色' }
    const levelColors = { red: '#d4380d', orange: '#fa8c16', yellow: '#faad14' }
    const gradeRows = s.riskGrading.length === 0
      ? ''
      : s.riskGrading
          .map((r) => `<tr><td style="border:1px solid #e8e8e8;padding:4px 10px">${r.name}</td><td style="text-align:center;border:1px solid #e8e8e8;padding:4px 10px"><span style="color:#fff;background:${levelColors[r.level]};padding:1px 6px;border-radius:3px;font-size:11px">${levelLabels[r.level]}</span></td><td style="text-align:center;border:1px solid #e8e8e8;padding:4px 10px">${r.count}</td><td style="border:1px solid #e8e8e8;padding:4px 10px;font-size:11px">${r.reason}</td></tr>`)
          .join('')
    riskTable = `<div style="color:#666;font-size:11px;margin:4px 0 6px">商家风险等级评定</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px"><thead><tr>
        <th style="border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">商家</th>
        <th style="width:10%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">等级</th>
        <th style="width:10%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">次数</th>
        <th style="width:45%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">研判依据</th>
      </tr></thead><tbody>${gradeRows}</tbody></table>`
  } else {
    paras.push(`<p ${pStyle}><b>三是市场秩序总体平稳。</b>本期未发现同一商家重复投诉情况。</p>`)
  }

  // 四是：共性问题
  if (s.keywordStats.length > 0) {
    const kws = s.keywordStats.slice(0, 5).map((k) => `${k.keyword}（${k.count}件）`).join('、')
    paras.push(`<p ${pStyle}><b>四是共性问题以"${s.keywordStats[0].keyword}"等为主。</b>本期投诉内容高频问题关键词包括${kws}，建议督促相关经营主体对照整改。</p>`)
  }

  // AI 归因结论（二期，mock 已模拟）
  let aiBlock = ''
  if (report.hasAiInsight && report.aiInsight) {
    aiBlock = `<div style="color:#666;font-size:11px;margin:4px 0 6px">AI 归因结论（二期）</div><div style="background:#f6ffed;border:1px solid #b7eb8f;padding:10px;border-radius:4px;line-height:1.8">${report.aiInsight}</div>`
  } else {
    aiBlock = `<div style="color:#666;font-size:11px;margin:4px 0 6px">AI 归因结论</div><div style="color:#999;padding:6px">AI 文本归因二期上线后自动生成（可人工编辑后定稿）</div>`
  }

  return `${paras.join('')}${riskTable}
    ${aiBlock}
    <div style="color:#999;font-size:10px;margin-top:6px">⚠ AI 归因为模拟内容，二期上线后由模型实时生成</div>`
}

function buildOverviewText(report: ComplaintReport): string {
  const s = normalizeSnapshot(report.snapshot)
  const scope = report.scopeName
  const period = `${report.periodStart}至${report.periodEnd}`
  if (s.total === 0) {
    return `${period}，${scope}统计范围内无投诉数据，旅游市场整体运行平稳。`
  }
  const topMethod = s.methodStats[0]
  const topRegion = s.regionStats[0]
  const topCategory = s.categoryStats[0]
  const momText = s.prevPeriodCount === 0
    ? ''
    : `与上一周期（${s.prevPeriodCount} 件）相比${s.momRate >= 0 ? '上升' : '下降'} ${Math.abs(s.momRate).toFixed(1)}%。`
  const methodText = topMethod ? `从投诉来源看，${topMethod.label}占比最高（${((topMethod.count / s.total) * 100).toFixed(2)}%）；` : ''
  const regionText = topRegion ? `从行政区域看，${topRegion.name}投诉量居前（${topRegion.count}件）；` : ''
  const categoryText = topCategory ? `从被投诉对象看，${topCategory.label}类投诉最为集中（${topCategory.count}件，占${((topCategory.count / s.total) * 100).toFixed(2)}%）。` : ''
  return `${period}，${scope}共受理旅游投诉 ${s.total} 件，其中待办 ${s.pending} 件、已办结 ${s.closedCount} 件。${methodText}${regionText}${categoryText}${momText}`
}

function buildAdviceText(report: ComplaintReport): string {
  const s = normalizeSnapshot(report.snapshot)
  if (s.total === 0) {
    return '（一）本周期无投诉，建议继续保持现有监管力度，加强节假日应急值守。'
  }
  // 以聚类数据驱动建议，给出可执行指引（约谈谁、关注哪个区域哪类）
  const advice: string[] = []
  s.respondentClusters.slice(0, 3).forEach((r) => {
    advice.push(`约谈/专项检查"${r.name}"：本期被投诉 ${r.count} 次，涉及${r.categories.join('、')}，最近投诉时间 ${r.lastComplaintTime || '-'}，建议下发整改通知并跟踪复查。`)
  })
  s.regionCategoryClusters.slice(0, 3).forEach((r) => {
    advice.push(`重点巡查 ${r.region} 的 ${r.categoryLabel} 领域：本期同类投诉 ${r.count} 件，建议联合属地文旅、市场监管部门开展专项巡查。`)
  })
  if (s.transferredCount > 0) {
    advice.push(`跟踪 ${s.transferredCount} 件移送问题线索（转立案）处置进展，涉嫌违法线索已移交执法部门，建议定期对接结果反馈。`)
  }
  if (s.pending > 0) {
    advice.push(`推进 ${s.pending} 件待办投诉清零，避免节假日前夕积压。`)
  }
  if (advice.length === 0) {
    advice.push('本周期投诉态势平稳，建议继续保持现有监管力度。')
  }
  return advice.map((a, i) => `（${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i] || i + 1}）${a}`).join('<br/>')
}

export function buildComplaintReportHtml(report: ComplaintReport): string {
  const s = normalizeSnapshot(report.snapshot)
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
          return sectionHtml(id, c.title, coreMetricsHtml(s) + chartNote(coreMetricsNote(s)))
        case 'method_pie':
          return sectionHtml(id, c.title, statTable(s.methodStats.map((m) => ({ label: m.label, count: m.count })), s.total) + chartNote(methodNote(s)))
        case 'category_bar':
          return sectionHtml(id, c.title, statTable(s.categoryStats.map((m) => ({ label: m.label, count: m.count })), s.total) + chartNote(categoryNote(s)))
        case 'region_bar':
          return sectionHtml(
            id,
            c.title,
            statTable(s.regionStats.map((r) => ({ label: r.name, count: r.count })), s.total) + chartNote(regionNote(s)),
          )
        case 'status_donut':
          return sectionHtml(id, c.title, statTable(s.statusStats.map((m) => ({ label: m.label, count: m.count })), s.total) + chartNote(statusNote(s)))
        case 'problem_analysis':
          return sectionHtml(id, c.title, problemAnalysisHtml(s) + chartNote(problemAnalysisNote(s)))
        case 'transfer_analysis':
          return sectionHtml(id, c.title, transferAnalysisHtml(s))
        case 'transferred_cases':
          return sectionHtml(id, c.title, transferredCasesHtml(s) + chartNote(transferredCasesNote(s)))
        case 'trend_line':
          return sectionHtml(id, c.title, trendSvg(s.trendStats) + chartNote(trendNote(s)))
        case 'top_respondents':
          return sectionHtml(id, c.title, topRespondentsHtml(s) + chartNote(topRespondentsNote(s)))
        case 'quality':
          return sectionHtml(id, c.title, qualityHtml(s) + chartNote(qualityNote(s)))
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

  // 公文落款：单位 + 生成日期（V1.4）
  const signerOrg =
    report.scopeName === '全省' ? '贵州省文化和旅游厅' : `${report.scopeName}文化和旅游局`
  const signDate = (report.generatedAt || '').slice(0, 10)
  const signDateCn = signDate
    ? `${Number(signDate.slice(0, 4))}年${Number(signDate.slice(5, 7))}月${Number(signDate.slice(8, 10))}日`
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
  .signer { margin-top: 40px; text-align: right; font-family: 'SimSun', '宋体', serif; font-size: 13px; color: #000; line-height: 2.2; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <h1>${report.title}</h1>
  <div class="meta">统计周期：${report.periodStart} 至 ${report.periodEnd} ｜ 数据范围：${scopeLabel}</div>
  <div class="meta">生成时间：${report.generatedAt} ｜ 生成人：${report.generatedBy} ｜ 触发方式：${report.trigger === 'scheduled' ? '定时任务' : '手动生成'}</div>
  ${emptyAlert}
  <div class="anchor-nav no-print">${anchors}</div>
  ${sections}
  <div class="signer">
    <div>${signerOrg}</div>
    <div>${signDateCn}</div>
  </div>
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
    ReplyStatusLabels[c.replyStatus] || c.replyStatus,
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
