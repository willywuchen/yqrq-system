import {
  ComplaintReportScopeLabels,
  ComplaintSourceLabels,
  TourismCategoryLabels,
  ComplaintStatusLabels,
  ReplyStatusLabels,
  GUIZHOU_CITIES,
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
    sourceStats: s?.sourceStats ?? [],
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
    prevPeriodCount: s?.prevPeriodCount ?? 0,
    momRate: s?.momRate ?? 0,
    riskGrading: s?.riskGrading ?? [],
    transferredCases: (s?.transferredCases ?? []).map((c: any) => ({
      id: c?.id ?? '',
      respondentName: c?.respondentName ?? '未知',
      complaintTime: c?.complaintTime ?? '',
      suspectedIssue: c?.suspectedIssue ?? '',
      statusLabel: c?.statusLabel ?? '',
      region: c?.region ?? '未知',
      city: c?.city ?? '未知',
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
  if (s.total === 0) return '本期统计范围内无投诉数据，各项指标均为空，旅游市场整体运行平稳。'
  const topRegion = s.regionStats[0]
  return `本期共受理旅游投诉${s.total}件，其中未办结${s.pending}件、已办结${s.closedCount}件。投诉量最高的区域为${topRegion?.name ?? '-'}。未办结量反映本期处置压力，办结率仅作参考指标、不作核心考核。`
}

function methodNote(s: ComplaintReportSnapshot): string {
  if (s.sourceStats.length === 0) return '本期无投诉来源数据。'
  const top = s.sourceStats[0]
  const topPct = s.total > 0 ? ((top.count / s.total) * 100).toFixed(2) : '-'
  return `从投诉来源来划分。${enumStats(s.sourceStats.map((m) => ({ label: m.label, count: m.count })), s.total)}。投诉来源以${top.label}为主，占${topPct}%，是游客反映涉旅问题的主要渠道，建议持续保障该渠道受理与转办时效。`
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

// V1.10：解读基于前十被投诉对象统计（不再涉及投诉内容分析）
function problemAnalysisNote(s: ComplaintReportSnapshot): string {
  if (s.topRespondents.length === 0) {
    return '本期无被投诉对象统计数据。'
  }
  const top = s.topRespondents[0]
  return `投诉量前十的被投诉对象见上表，其中「${top.name}」以 ${top.count} 件居首。被投诉对象集中的问题反映共性短板，建议督促相关经营主体对照整改并跟踪复查。`
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
  const topRegionName = s.regionStats[0]?.name || '-'
  return `<div style="display:flex;gap:12px">
    <div style="flex:1;background:#f0f5ff;border:1px solid #adc6ff;border-radius:6px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#1677ff">${s.total}</div><div style="color:#666;margin-top:4px">投诉总量（件）</div></div>
    <div style="flex:1;background:#fff7e6;border:1px solid #ffd591;border-radius:6px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#fa8c16">${s.pending}</div><div style="color:#666;margin-top:4px">未办结数（件）</div></div>
    <div style="flex:1;background:#f6ffed;border:1px solid #b7eb8f;border-radius:6px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#52c41a">${s.closedCount}</div><div style="color:#666;margin-top:4px">已办结数（件）</div></div>
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

// 投诉量前十的被投诉对象（V1.9：问题性质章不再做类别×关键词交叉统计（依赖投诉内容分析）；
// V1.10：章名更名「投诉量前十的被投诉对象」，去掉（一）小节标题，表格由前五扩为前十）
function problemAnalysisHtml(s: ComplaintReportSnapshot): string {
  const top10 = s.topRespondents.slice(0, 10)
  const rows = top10.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#999;padding:8px">无被投诉对象统计数据</td></tr>'
    : top10
        .map((r, i) => `<tr><td style="text-align:center;padding:4px 10px;border:1px solid #e8e8e8">${i + 1}</td><td style="padding:4px 10px;border:1px solid #e8e8e8">${r.name}</td><td style="text-align:center;padding:4px 10px;border:1px solid #e8e8e8;font-weight:600">${r.count}</td><td style="padding:4px 10px;border:1px solid #e8e8e8">${r.lastComplaintTime || '-'}</td></tr>`)
        .join('')
  return `<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr>
      <th style="width:8%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">排名</th>
      <th style="border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">被投诉对象</th>
      <th style="width:14%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">投诉量（件）</th>
      <th style="width:18%;border:1px solid #d9d9d9;padding:4px 10px;background:#fafafa">最近投诉时间</th>
    </tr></thead><tbody>${rows}</tbody></table>`
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
// V1.8：交叉表横排地区固定为贵州九市州名称（贵阳市、遵义市……），线索按所属市州归列
function transferAnalysisHtml(s: ComplaintReportSnapshot): string {
  const cases = s.transferredCases
  if (cases.length === 0) {
    return '<p style="line-height:1.8;text-indent:2em">本期统计范围内无转办、移送问题线索投诉，各渠道诉求均在文旅部门职责范围内受理处置。</p>'
  }
  const total = cases.length
  // 横排地区固定为贵州九市州；个别线索市州缺失/异常时在末尾补充额外列，保证合计不缺漏
  const cityCount = new Map<string, number>()
  cases.forEach((c) => cityCount.set(c.city, (cityCount.get(c.city) || 0) + 1))
  const extraCities = Array.from(cityCount.keys()).filter((name) => !GUIZHOU_CITIES.includes(name))
  const regions = [...GUIZHOU_CITIES, ...extraCities]
  // 部门 / 主题 维度统计与市州交叉
  const dimCount: Record<'department' | 'theme', Map<string, number>> = {
    department: new Map(),
    theme: new Map(),
  }
  const cross = new Map<string, number>() // `市州|维度值` -> 条数
  cases.forEach((c) => {
    ;(['department', 'theme'] as const).forEach((key) => {
      dimCount[key].set(c[key], (dimCount[key].get(c[key]) || 0) + 1)
      const k = `${c.city}|${c[key]}`
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
        <th style="width:${Math.max(18, 46 - regions.length * 3)}%;${th}">${key === 'department' ? '移送或涉及部门' : '线索主题'}</th>
        ${headCells}<th style="${th}">合计（条）</th>
      </tr></thead><tbody>${bodyRows}</tbody></table>`
  }

  // 文字解读：总体 + 部门 + 分市州（参照附件公文写法；主题作为区域解读中的描述信息）
  const join条 = (entries: [string, number][], max = 5) =>
    entries.slice(0, max).map(([name, count]) => `${name}${count}条`).join('、')
  const deptEntries = sortedDim('department')
  const themeEntries = sortedDim('theme')
  const ratio = s.total > 0 ? ((total / s.total) * 100).toFixed(2) : '-'
  const paras: string[] = []
  paras.push(`本期共转办、移送问题线索${total}条，占投诉总量的${ratio}%。按移送或涉及部门看，主要为${join条(deptEntries)}。其中${deptEntries[0][0]}受理线索最多，反映市场监管、消费维权类事项仍是跨部门移送的主要事项。`)
  const regionParas = Array.from(cityCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rg, count]) => {
      const topTheme = themeEntries
        .filter(([name]) => cases.some((c) => c.city === rg && c.theme === name))
        .sort((a, b) => (cross.get(`${rg}|${b[0]}`) || 0) - (cross.get(`${rg}|${a[0]}`) || 0))[0]
      const topDept = deptEntries
        .filter(([name]) => cases.some((c) => c.city === rg && c.department === name))
        .sort((a, b) => (cross.get(`${rg}|${b[0]}`) || 0) - (cross.get(`${rg}|${a[0]}`) || 0))[0]
      return `${rg}共有移送问题线索${count}条，主要为${topTheme ? `"${topTheme[0]}"类（${cross.get(`${rg}|${topTheme[0]}`) || 0}条）` : '其他事项'}，已按职责移送${topDept ? topDept[0] : '相关部门'}处置。`
    })
  paras.push(...regionParas)

  return `${crossTable('按移送或涉及部门统计', 'department')}${paras.map((p) => `<p style="line-height:1.8;text-indent:2em;margin:0 0 6px">${p}</p>`).join('')}`
}

function buildOverviewText(report: ComplaintReport): string {
  const s = normalizeSnapshot(report.snapshot)
  const scope = report.scopeName
  const period = `${report.periodStart}至${report.periodEnd}`
  if (s.total === 0) {
    return `${period}，${scope}统计范围内无投诉数据，旅游市场整体运行平稳。`
  }
  const topSource = s.sourceStats[0]
  const topRegion = s.regionStats[0]
  const topCategory = s.categoryStats[0]
  const momText = s.prevPeriodCount === 0
    ? ''
    : `与上一周期（${s.prevPeriodCount} 件）相比${s.momRate >= 0 ? '上升' : '下降'} ${Math.abs(s.momRate).toFixed(1)}%。`
  const methodText = topSource ? `从投诉来源看，${topSource.label}占比最高（${((topSource.count / s.total) * 100).toFixed(2)}%）；` : ''
  const regionText = topRegion ? `从行政区域看，${topRegion.name}投诉量居前（${topRegion.count}件）；` : ''
  const categoryText = topCategory ? `从被投诉对象看，${topCategory.label}类投诉最为集中（${topCategory.count}件，占${((topCategory.count / s.total) * 100).toFixed(2)}%）。` : ''
  return `${period}，${scope}共受理旅游投诉 ${s.total} 件，其中未办结 ${s.pending} 件、已办结 ${s.closedCount} 件。${methodText}${regionText}${categoryText}${momText}`
}

// V1.9 下线章节：依赖投诉内容语义分析（本期不接入 AI）。
// 历史报表冻结的章节列表中可能仍含这两类，渲染时一并过滤，避免出现空标题章节
const REMOVED_CHAPTER_KINDS = new Set<string>(['ai_insight', 'advice'])

// V1.10 章名覆盖：第六章更名后，历史报表冻结的旧标题（「六、从投诉问题性质划分」）在渲染时统一纠正
const CHAPTER_TITLE_OVERRIDES: Partial<Record<string, string>> = {
  problem_analysis: '六、投诉量前十的被投诉对象',
}

export function buildComplaintReportHtml(report: ComplaintReport): string {
  const s = normalizeSnapshot(report.snapshot)
  const scopeLabel = `${ComplaintReportScopeLabels[report.scopeLevel]} · ${report.scopeName}`
  const chapters = (report.chapters || [])
    .filter((c) => c.enabled && !REMOVED_CHAPTER_KINDS.has(c.kind))
    .map((c) => ({ ...c, title: CHAPTER_TITLE_OVERRIDES[c.kind] ?? c.title }))

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
          return sectionHtml(id, c.title, statTable(s.sourceStats.map((m) => ({ label: m.label, count: m.count })), s.total) + chartNote(methodNote(s)))
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
  const header = ['序号', '投诉编号', '投诉时间', '投诉来源', '旅游类别', '投诉人', '联系电话', '省', '市', '县', '被投诉人', '状态', '办结状态', '转立案', '投诉内容', '统计周期']
  const rows = details.map((c, i) => [
    i + 1,
    c.id,
    c.complaintTime,
    ComplaintSourceLabels[c.complaintSource] || c.complaintSource,
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
