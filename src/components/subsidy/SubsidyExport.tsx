import { Modal, Radio, App, Space, Typography, Alert } from 'antd'
import { ExportOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useStore } from '../../store'
import { nowStr, maskIdNumber, maskPhone } from '../../utils'

const { Text } = Typography

interface Props {
  open: boolean
  onClose: () => void
  applicationId: string
}

export default function SubsidyExport({ open, onClose, applicationId }: Props) {
  const { subsidyApplications, currentUser, appendSubsidyLog } = useStore()
  const { message } = App.useApp()
  const [type, setType] = useState<'team' | 'form'>('team')

  const app = subsidyApplications.find((a) => a.id === applicationId)
  if (!app) {
    return null
  }

  // 生成团行程信息附件 HTML
  const buildTeamHtml = (): string => {
    const s = app.teamPresetSnapshot
    const sourcePlaces = Array.from(new Set(s.tourists.map((t) => t.sourcePlace || t.nationality).filter(Boolean)))
    const guide = s.guideDrivers.find((g) => g.type === 'guide')
    const driver = s.guideDrivers.find((g) => g.type === 'driver')
    const flightInfo = s.flightNo ? `<tr><td>航班号</td><td colspan="5">${s.flightNo}</td></tr>` : ''
    const trainInfo = s.trainNo ? `<tr><td>车次</td><td colspan="5">${s.trainNo}</td></tr>` : ''

    // 游客名单
    const touristRows = s.tourists
      .map(
        (t, i) => `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${t.name || ''}</td>
        <td style="text-align:center">${t.idType === 'passport' ? '护照' : t.idType === 'hk_macao_pass' ? '港澳通行证' : t.idType === 'tw_pass' ? '台湾通行证' : '其他'}</td>
        <td>${maskIdNumber(t.idNumber)}</td>
        <td style="text-align:center">${t.nationality || ''}</td>
        <td>${t.sourcePlace || ''}</td>
        <td>${maskPhone(t.phone)}</td>
      </tr>`,
      )
      .join('')

    // 行程信息（按住宿天 + 景区）
    const itineraryRows = s.accommodations
      .map((a, i) => {
        const scenic = s.scenics.find((sc) => sc.enterTime?.startsWith(a.checkInDate))
        return `<tr>
          <td style="text-align:center">${i + 1}</td>
          <td style="text-align:center">${a.checkInDate}</td>
          <td>${scenic ? scenic.name : '-'}</td>
          <td>${a.hotelName}</td>
          <td style="text-align:center">${a.checkOutDate}</td>
        </tr>`
      })
      .join('')

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${app.unitName}_${s.dispatchNo}_团行程信息</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: 'SimSun', '宋体', serif; font-size: 12px; color: #000; }
  h1 { text-align: center; font-size: 18px; margin: 0 0 16px 0; font-family: 'SimHei', '黑体', sans-serif; }
  h2 { font-size: 14px; margin: 16px 0 8px 0; font-family: 'SimHei', '黑体', sans-serif; border-left: 4px solid #1677ff; padding-left: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  td, th { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
  th { background: #f0f0f0; font-weight: 600; text-align: center; }
  .meta-table td:nth-child(odd) { width: 16%; background: #fafafa; font-weight: 600; }
  .meta-table td:nth-child(even) { width: 17%; }
  .footer { margin-top: 32px; text-align: right; }
  .stamp-area { margin-top: 24px; display: flex; justify-content: space-between; }
  .stamp-box { border: 1px dashed #999; padding: 16px 32px; text-align: center; color: #999; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <h1>旅行社团行程信息</h1>

  <h2>一、团基本信息</h2>
  <table class="meta-table">
    <tr><td>团单位名称</td><td>${app.unitName}</td><td>持单人</td><td>${app.operator || ''}</td><td>行程单号</td><td>${s.dispatchNo}</td></tr>
    <tr><td>旅游路线</td><td colspan="5">${s.travelDesc}</td></tr>
    <tr><td>行程日期</td><td>${s.travelStart}</td><td>至</td><td>${s.travelEnd}</td><td>总天数</td><td>${s.stayDays}天</td></tr>
    <tr><td>接待类型</td><td>团队</td><td>客源地</td><td>${sourcePlaces.join('、')}</td><td>旅客人数</td><td>${s.teamSize}人</td></tr>
    ${flightInfo}
    ${trainInfo}
    <tr><td>导游证号/手机</td><td>${guide ? `${guide.licenseNo || ''} / ${guide.name}` : '-'}</td><td>车牌或车号</td><td>${driver?.licenseNo || '-'}</td><td>驾驶员姓名/手机</td><td>${driver?.name || '-'}</td></tr>
    <tr><td>备注</td><td colspan="5">- 本表为系统自动生成的团行程信息附件，数据来源：团信息快照（拉取时间 ${app.createTime}）</td></tr>
  </table>

  <h2>二、行程信息（按天）</h2>
  <table>
    <thead>
      <tr><th style="width:8%">序号</th><th style="width:18%">日期</th><th style="width:32%">主要景区/站点</th><th style="width:24%">住宿酒店</th><th style="width:18%">退房日期</th></tr>
    </thead>
    <tbody>
      ${itineraryRows || '<tr><td colspan="5" style="text-align:center;color:#999">无行程信息</td></tr>'}
    </tbody>
  </table>

  <h2>三、游客名单</h2>
  <table>
    <thead>
      <tr>
        <th style="width:6%">序号</th>
        <th style="width:18%">姓名</th>
        <th style="width:12%">证件类型</th>
        <th style="width:22%">证件号码</th>
        <th style="width:12%">国籍/地区</th>
        <th style="width:15%">客源地</th>
        <th style="width:15%">手机号</th>
      </tr>
    </thead>
    <tbody>
      ${touristRows || '<tr><td colspan="7" style="text-align:center;color:#999">无游客信息</td></tr>'}
    </tbody>
  </table>

  <div class="stamp-area">
    <div class="stamp-box">旅行社盖章（电子章）</div>
    <div class="stamp-box">导游签字：${guide?.name || ''}</div>
  </div>

  <div class="footer">
    <p>生成时间：${nowStr()}</p>
    <p>申报编号：${app.applicationNo}</p>
  </div>

  <div class="no-print" style="position:fixed;top:8px;right:8px;">
    <button onclick="window.print()" style="padding:8px 16px;background:#1677ff;color:#fff;border:none;border-radius:4px;cursor:pointer;">打印 / 另存为 PDF</button>
    <button onclick="window.close()" style="padding:8px 16px;background:#999;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-left:8px;">关闭</button>
  </div>
</body>
</html>`
  }

  // 生成申报表附件 HTML（按团申报信息.docx 结构：32行11列表格 + 合并单元格）
  const buildFormHtml = (): string => {
    const s = app.teamPresetSnapshot
    const bi = app.teamBaseInfo

    // 团队接待奖励行（9行）
    const receptionRowsHtml = app.teamReceptionRows
      .map(
        (r) => `<tr><td style="text-align:center">${r.project}</td><td style="text-align:right">${r.amount.toFixed(2)}</td><td style="text-align:center">${r.teamSize}</td></tr>`,
      )
      .join('')

    // 专项奖励行（6行）
    const specialRowsHtml = app.specialTourismRows
      .map(
        (r) => `<tr><td style="text-align:center">${r.project}</td><td style="text-align:right">${r.amount.toFixed(2)}</td><td style="text-align:center">${r.teamSize}</td></tr>`,
      )
      .join('')

    // 文旅宣传奖励行（4行）
    const cultureRowsHtml = app.culturePromotionRows
      .map(
        (r) => `<tr><td style="text-align:center">${r.project}</td><td style="text-align:right">${r.amount.toFixed(2)}</td><td>${r.activityName || ''}</td><td>${r.location || ''}</td><td style="text-align:center">${r.participants}</td></tr>`,
      )
      .join('')

    // 前5晚酒店
    const hotelNights = (bi.hotelFirst5Nights || []).map((h, i) => `<tr><td style="text-align:center">第${i + 1}晚</td><td colspan="9">${h}</td></tr>`).join('')

    // 4A+景区
    const scenicNames = (bi.scenicNames4APlus || []).join('、')

    // 车号
    const vehicleNos = (bi.vehicleNos || []).join('、')

    const totalAmountText = app.totalAmount.toFixed(2)

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${app.unitName}_${s.dispatchNo}_引客入黔申报表</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: 'SimSun', '宋体', serif; font-size: 11px; color: #000; }
  h1 { text-align: center; font-size: 18px; margin: 0 0 12px 0; font-family: 'SimHei', '黑体', sans-serif; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  td, th { border: 1px solid #333; padding: 4px 6px; vertical-align: middle; line-height: 1.5; }
  td.label { background: #fafafa; font-weight: 600; text-align: center; }
  td.center { text-align: center; }
  td.right { text-align: right; }
  .section-title { background: #e6f4ff; font-weight: 600; text-align: center; font-family: 'SimHei', '黑体', sans-serif; }
  .declaration { margin: 12px 0; padding: 8px; border: 1px solid #999; line-height: 1.8; }
  .sign-area { display: flex; justify-content: space-around; margin-top: 24px; }
  .sign-box { text-align: center; min-width: 200px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <h1>2026年贵州省入境"引客入黔"旅游奖励申报表</h1>

  <table>
    <!-- 区块A：申报单位基本信息 -->
    <tr class="section-title"><td colspan="11">一、申报单位基本信息</td></tr>
    <tr>
      <td class="label" style="width:12%">单位名称</td>
      <td colspan="3">${app.unitName}</td>
      <td class="label" style="width:12%">法定代表人</td>
      <td colspan="2">${app.legalRepresentative || ''}</td>
      <td class="label" style="width:10%">经办人</td>
      <td colspan="2">${app.operator || ''}</td>
      <td class="label" style="width:8%">联系电话</td>
    </tr>
    <tr>
      <td class="label">联系电话</td>
      <td colspan="3">${app.contactPhone || ''}</td>
      <td class="label">户名</td>
      <td colspan="2">${app.bankAccount?.accountName || ''}</td>
      <td class="label">开户行</td>
      <td colspan="2">${app.bankAccount?.bankName || ''}</td>
      <td class="label">账号</td>
    </tr>
    <tr>
      <td class="label">银行账号</td>
      <td colspan="10">${app.bankAccount?.accountNo || ''}</td>
    </tr>

    <!-- 区块B：入境旅游团队接待奖励 -->
    <tr class="section-title"><td colspan="11">二、入境旅游团队接待奖励申报</td></tr>
    <tr>
      <td class="center" colspan="6" style="width:60%">申请项目</td>
      <td class="center" colspan="3" style="width:25%">申请奖励金额（元）</td>
      <td class="center" colspan="2" style="width:15%">申请团队人数</td>
    </tr>
    ${receptionRowsHtml}
    <tr>
      <td class="label" colspan="6">小计</td>
      <td class="right" colspan="3">${app.teamReceptionRows.reduce((s, r) => s + r.amount, 0).toFixed(2)}</td>
      <td class="center" colspan="2">${app.teamReceptionRows.reduce((s, r) => s + r.teamSize, 0)}</td>
    </tr>

    <!-- 区块C：专项旅游奖励 -->
    <tr class="section-title"><td colspan="11">三、专项旅游奖励申报</td></tr>
    <tr>
      <td class="center" colspan="6">申请项目</td>
      <td class="center" colspan="3">申请奖励金额（元）</td>
      <td class="center" colspan="2">申请团队人数</td>
    </tr>
    ${specialRowsHtml}
    <tr>
      <td class="label" colspan="6">小计</td>
      <td class="right" colspan="3">${app.specialTourismRows.reduce((s, r) => s + r.amount, 0).toFixed(2)}</td>
      <td class="center" colspan="2">${app.specialTourismRows.reduce((s, r) => s + r.teamSize, 0)}</td>
    </tr>

    <!-- 区块D：团队基本信息 -->
    <tr class="section-title"><td colspan="11">四、团队基本信息</td></tr>
    <tr>
      <td class="label" colspan="2">团队编号</td>
      <td colspan="3">${bi.teamNo || ''}</td>
      <td class="label" colspan="2">游客来源地</td>
      <td colspan="4">${bi.sourcePlace || ''}</td>
    </tr>
    <tr>
      <td class="label" colspan="2">在黔时间</td>
      <td colspan="3">${bi.travelStartDate || ''} 至 ${bi.travelEndDate || ''}</td>
      <td class="label" colspan="2">总晚数/总天数</td>
      <td colspan="4">${bi.nights || 0}晚 / ${bi.days || 0}天</td>
    </tr>
    <tr>
      <td class="label" colspan="2">省外组团社名称</td>
      <td colspan="9">${bi.outboundTourOrgName || ''}</td>
    </tr>
    <tr>
      <td class="label" colspan="2">团队住宿信息</td>
      <td colspan="9">
        ${hotelNights || '<div style="color:#999;text-align:center">无住宿信息</div>'}
      </td>
    </tr>
    <tr>
      <td class="label" colspan="2">酒店星级</td>
      <td colspan="3">${bi.hotelStar || ''}</td>
      <td class="label" colspan="2">租用客车-辆数</td>
      <td colspan="4">${bi.vehicleCount || 0}辆（车号：${vehicleNos || '-'}）</td>
    </tr>
    <tr>
      <td class="label" colspan="2">4A+景区数量</td>
      <td colspan="3">${bi.scenicCount4APlus || 0}个</td>
      <td class="label" colspan="2">4A+景区名称</td>
      <td colspan="4">${scenicNames || '-'}</td>
    </tr>

    <!-- 区块E：旅游宣传奖励 -->
    <tr class="section-title"><td colspan="11">五、旅游宣传奖励申报</td></tr>
    <tr>
      <td class="center" colspan="3">申请项目</td>
      <td class="center" colspan="2">申请金额（元）</td>
      <td class="center" colspan="3">参加或组织活动名称</td>
      <td class="center">地点</td>
      <td class="center" colspan="2">派遣/接待人数</td>
    </tr>
    ${cultureRowsHtml}
    <tr>
      <td class="label" colspan="3">小计</td>
      <td class="right" colspan="2">${app.culturePromotionRows.reduce((s, r) => s + r.amount, 0).toFixed(2)}</td>
      <td colspan="3">-</td>
      <td>-</td>
      <td class="center" colspan="2">${app.culturePromotionRows.reduce((s, r) => s + r.participants, 0)}</td>
    </tr>

    <!-- 合计 -->
    <tr>
      <td class="label" colspan="6">申请奖励金额合计（大写）</td>
      <td class="right" colspan="5" style="font-size:13px;color:#cf1322;font-weight:700;">
        ¥${totalAmountText}
      </td>
    </tr>

    <!-- 区块F：承诺与签字 -->
    <tr class="section-title"><td colspan="11">六、承诺与签字</td></tr>
    <tr>
      <td colspan="11" style="line-height:2;">
        <div class="declaration">
          我单位郑重承诺：上述填报信息及所附证明材料全部属实。如有虚假，自愿承担相应法律责任。
        </div>
      </td>
    </tr>
    <tr>
      <td class="label" colspan="2">法人代表签字</td>
      <td colspan="3">${app.declaration.legalRepSignature || ''}</td>
      <td class="label" colspan="2">经办人员签字</td>
      <td colspan="4">${app.declaration.operatorSignature || ''}</td>
    </tr>
    <tr>
      <td class="label" colspan="2">联系电话</td>
      <td colspan="3">${app.declaration.contactPhone || app.contactPhone || ''}</td>
      <td class="label" colspan="2">日期</td>
      <td colspan="4">${app.declaration.date || ''}</td>
    </tr>
  </table>

  <div class="sign-area">
    <div class="sign-box">
      <p>申报单位（盖章）：</p>
      <div style="height:80px;border-bottom:1px solid #333;width:200px;margin:0 auto;"></div>
    </div>
    <div class="sign-box">
      <p>省文旅厅（接收）：</p>
      <div style="height:80px;border-bottom:1px solid #333;width:200px;margin:0 auto;"></div>
    </div>
  </div>

  <div style="margin-top:32px;text-align:right;color:#666;font-size:10px;">
    <p>申报编号：${app.applicationNo} · 生成时间：${nowStr()}</p>
  </div>

  <div class="no-print" style="position:fixed;top:8px;right:8px;">
    <button onclick="window.print()" style="padding:8px 16px;background:#1677ff;color:#fff;border:none;border-radius:4px;cursor:pointer;">打印 / 另存为 PDF</button>
    <button onclick="window.close()" style="padding:8px 16px;background:#999;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-left:8px;">关闭</button>
  </div>
</body>
</html>`
  }

  const handleExport = () => {
    const html = type === 'team' ? buildTeamHtml() : buildFormHtml()
    const fileName = type === 'team'
      ? `${app.unitName}_${app.teamPresetSnapshot.dispatchNo}_团行程信息`
      : `${app.unitName}_${app.teamPresetSnapshot.dispatchNo}_引客入黔申报表`

    // 新窗口打开 HTML
    const newWin = window.open('', '_blank')
    if (!newWin) {
      message.error('浏览器拦截了新窗口，请允许弹出窗口后重试')
      return
    }
    newWin.document.open()
    newWin.document.write(html)
    newWin.document.close()
    newWin.document.title = fileName

    // 记录导出日志
    appendSubsidyLog({
      id: `sol-export-${app.id}-${type}-${Date.now()}`,
      applicationId: app.id,
      operator: currentUser.name,
      operatorRole: currentUser.role,
      action: type === 'team' ? 'export_team' : 'export_form',
      comment: `导出${type === 'team' ? '《旅行社团行程信息》' : '《引客入黔旅游奖励申报表》'}附件`,
      time: nowStr(),
    })

    message.success(`已生成附件《${fileName}》`)
    onClose()
  }

  return (
    <Modal
      title={
        <Space>
          <ExportOutlined />
          <span>导出附件</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleExport}
      okText="生成附件"
      cancelText="取消"
      width={520}
    >
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="导出说明"
        description="点击「生成附件」会在新窗口打开格式化后的附件页面，您可以使用浏览器的「打印」功能（Ctrl/Cmd + P）选择「另存为 PDF」保存为 PDF 文件，或直接打印。"
        style={{ marginBottom: 16 }}
      />

      <Radio.Group
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio value="team">
            <Space direction="vertical" style={{ marginLeft: 8 }}>
              <Text strong>《旅行社团行程信息》</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                团基本信息 + 行程信息 + 游客名单（横向 A4）
              </Text>
            </Space>
          </Radio>
          <Radio value="form">
            <Space direction="vertical" style={{ marginLeft: 8 }}>
              <Text strong>《2026年贵州省入境"引客入黔"旅游奖励申报表》</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                申报表完整内容（6区块 + 合并单元格，横向 A4）
              </Text>
            </Space>
          </Radio>
        </Space>
      </Radio.Group>

      <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          当前申报内容将实时生成附件；修改申报内容后再次导出，附件内容会随之更新。
        </Text>
      </div>
    </Modal>
  )
}
