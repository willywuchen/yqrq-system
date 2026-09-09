import { useMemo, useState } from 'react'
import { App, Button, Col, DatePicker, Form, Input, Radio, Row, Select, Space, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { CURRENT_AGENCY } from '../../../mock/agency'
import { useStore } from '../../../store'
import {
  ACADEMIC_DEGREE_OPTIONS,
  EDUCATION_OPTIONS,
  STUDY_FORM_OPTIONS,
  type AgencyAccount,
  type EducationItem,
} from '../../../types/agency'
import { nowStr } from '../../../utils'

// 个人资料可选项
const MARRIAGE_OPTIONS = ['未婚', '已婚', '离异', '丧偶']
const ETHNICITY_OPTIONS = [
  '汉族', '苗族', '布依族', '侗族', '土家族', '彝族', '仡佬族', '水族', '回族', '白族',
  '瑶族', '壮族', '畲族', '满族', '蒙古族', '藏族', '维吾尔族', '朝鲜族', '其他',
]
const POLITICAL_OPTIONS = ['中共党员', '中共预备党员', '共青团员', '民主党派成员', '无党派人士', '群众']
const NATIVE_PLACE_OPTIONS = [
  '北京市', '天津市', '河北省', '山西省', '内蒙古自治区', '辽宁省', '吉林省', '黑龙江省',
  '上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省',
  '湖北省', '湖南省', '广东省', '广西壮族自治区', '海南省', '重庆市', '四川省', '贵州省',
  '云南省', '西藏自治区', '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区',
  '香港特别行政区', '澳门特别行政区', '台湾省',
]

const toOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }))
const toDate = (v?: string) => (v ? dayjs(v) : undefined)

/**
 * 设置中心 · 个人资料（字段参照"修改个人信息"）
 * 编辑当前登录账号（主账号）的个人信息与教育经历，保存即时生效并记入操作记录
 */
export function PersonalProfileSection() {
  const { message } = App.useApp()
  const { agencyAccounts, currentUser, updateAgencyAccount, appendAgencyLog } = useStore()
  const [form] = Form.useForm()

  // 当前登录账号（演示环境主账号；找不到时兜底展示空资料）
  const account = useMemo(
    () => agencyAccounts.find((a) => a.agencyId === CURRENT_AGENCY.id && a.name === currentUser.name && a.role === 'owner'),
    [agencyAccounts, currentUser.name],
  )
  const [eduList, setEduList] = useState<EducationItem[]>(account?.education ?? [])

  if (!account) {
    return (
      <div style={{ padding: 24, color: '#999' }}>
        未找到当前账号的个人资料（演示数据已重置时请点击右上角「恢复演示数据」）。
      </div>
    )
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const patch: Partial<AgencyAccount> = {
        ...values,
        birthDate: (values.birthDate as Dayjs | undefined)?.format('YYYY-MM-DD'),
        education: eduList,
      }
      updateAgencyAccount(account.id, patch)
      appendAgencyLog({
        id: `L${Date.now()}`,
        agencyId: CURRENT_AGENCY.id,
        account: account.name,
        action: '修改个人资料',
        target: account.username,
        detail: '个人信息保存即时生效',
        createdAt: nowStr(),
      })
      message.success('个人资料已更新')
    } catch {
      // 校验失败
    }
  }

  // 教育经历列（可直接编辑的单元格）
  const eduColumns = [
    {
      title: '学习形式',
      dataIndex: 'studyForm',
      width: 120,
      render: (v: string | undefined, r: EducationItem) => (
        <Select
          style={{ width: '100%' }}
          value={v}
          options={toOptions(STUDY_FORM_OPTIONS)}
          placeholder="请选择"
          allowClear
          onChange={(val) => setEduList((l) => l.map((x) => (x.id === r.id ? { ...x, studyForm: val } : x)))}
        />
      ),
    },
    {
      title: '学历',
      dataIndex: 'degree',
      width: 130,
      render: (v: string | undefined, r: EducationItem) => (
        <Select
          style={{ width: '100%' }}
          value={v}
          options={toOptions(EDUCATION_OPTIONS)}
          placeholder="请选择"
          allowClear
          showSearch
          onChange={(val) => setEduList((l) => l.map((x) => (x.id === r.id ? { ...x, degree: val } : x)))}
        />
      ),
    },
    {
      title: '学位',
      dataIndex: 'academicDegree',
      width: 110,
      render: (v: string | undefined, r: EducationItem) => (
        <Select
          style={{ width: '100%' }}
          value={v}
          options={toOptions(ACADEMIC_DEGREE_OPTIONS)}
          placeholder="请选择"
          allowClear
          onChange={(val) => setEduList((l) => l.map((x) => (x.id === r.id ? { ...x, academicDegree: val } : x)))}
        />
      ),
    },
    {
      title: '毕业院校',
      dataIndex: 'school',
      render: (v: string | undefined, r: EducationItem) => (
        <Input
          value={v}
          maxLength={50}
          placeholder="请输入毕业院校"
          onChange={(e) => setEduList((l) => l.map((x) => (x.id === r.id ? { ...x, school: e.target.value } : x)))}
        />
      ),
    },
    {
      title: '所学专业',
      dataIndex: 'major',
      render: (v: string | undefined, r: EducationItem) => (
        <Input
          value={v}
          maxLength={50}
          placeholder="请输入所学专业"
          onChange={(e) => setEduList((l) => l.map((x) => (x.id === r.id ? { ...x, major: e.target.value } : x)))}
        />
      ),
    },
    {
      title: '毕业时间',
      dataIndex: 'graduationDate',
      width: 150,
      render: (v: string | undefined, r: EducationItem) => (
        <DatePicker
          style={{ width: '100%' }}
          value={toDate(v)}
          onChange={(_, dateStr) =>
            setEduList((l) => l.map((x) => (x.id === r.id ? { ...x, graduationDate: (dateStr as string) || undefined } : x)))
          }
        />
      ),
    },
    {
      title: '操作',
      width: 70,
      render: (_: unknown, r: EducationItem) => (
        <a style={{ color: '#ff4d4f' }} onClick={() => setEduList((l) => l.filter((x) => x.id !== r.id))}>
          删除
        </a>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 1200 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Space size="middle">
          <h3 style={{ margin: 0 }}>修改个人信息</h3>
          <Tag color="gold">主账号</Tag>
          <span style={{ color: '#999' }}>账号：{account.username}</span>
        </Space>
      </Row>
      <Form form={form} layout="vertical" initialValues={{ ...account, birthDate: toDate(account.birthDate) }}>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input maxLength={20} allowClear placeholder="请输入姓名" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="nickname" label="昵称">
              <Input maxLength={20} allowClear placeholder="请输入昵称" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="phone"
              label="手机号码"
              rules={[
                { required: true, message: '请输入手机号码' },
                { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
              ]}
            >
              <Input maxLength={11} allowClear placeholder="请输入手机号码" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
              <Radio.Group
                options={[
                  { value: 'male', label: '男' },
                  { value: 'female', label: '女' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="birthDate" label="出生日期">
              <DatePicker style={{ width: '100%' }} placeholder="请选择出生日期" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="idNo" label="身份证号码">
              <Input maxLength={18} allowClear placeholder="请输入身份证号码" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item name="marriageStatus" label="婚姻状态">
              <Select options={toOptions(MARRIAGE_OPTIONS)} placeholder="请选择婚姻状态" allowClear />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ethnicity" label="民族">
              <Select options={toOptions(ETHNICITY_OPTIONS)} placeholder="请选择民族" allowClear showSearch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="politicalStatus" label="政治面貌">
              <Select options={toOptions(POLITICAL_OPTIONS)} placeholder="请选择政治面貌" allowClear />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item
              name="email"
              label="电子邮件"
              rules={[{ type: 'email', message: '邮箱格式不正确' }]}
            >
              <Input allowClear placeholder="请输入电子邮件" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="wechatNo" label="微信号">
              <Input maxLength={30} allowClear placeholder="请输入微信号" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="dingtalkNo" label="钉钉号">
              <Input maxLength={30} allowClear placeholder="请输入钉钉号" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item name="backupPhone" label="备用电话">
              <Input maxLength={20} allowClear placeholder="请输入备用电话" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="nativePlace" label="籍贯">
              <Select options={toOptions(NATIVE_PLACE_OPTIONS)} placeholder="请选择籍贯" allowClear showSearch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="address" label="住址">
              <Input maxLength={100} allowClear placeholder="请输入住址" />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <h3 style={{ margin: '8px 0 12px' }}>教育经历</h3>
      <Table
        rowKey="id"
        size="middle"
        columns={eduColumns}
        dataSource={eduList}
        pagination={false}
        locale={{ emptyText: '暂无教育经历，点击下方「新增」添加' }}
      />
      <Button
        type="primary"
        icon={<PlusOutlined />}
        style={{ marginTop: 16 }}
        onClick={() =>
          setEduList((l) => [...l, { id: `E${Date.now()}`, studyForm: '全日制' }])
        }
      >
        新增
      </Button>

      <Row justify="end" style={{ marginTop: 24 }}>
        <Button type="primary" onClick={handleSubmit}>
          提交
        </Button>
      </Row>
    </div>
  )
}
