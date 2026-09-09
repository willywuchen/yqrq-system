import { useEffect, useState } from 'react'
import { Alert, App, Button, Cascader, Col, Form, Input, Radio, Row, Select, Space, Tag, Upload } from 'antd'
import { FileImageOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import { useStore } from '../../../store'
import { CURRENT_AGENCY } from '../../../mock/agency'
import { GUIZHOU_REGION_OPTIONS, pathToRegion, regionToPath } from '../../../components/agency/regions'
import {
  BusinessStatusLabels,
  CertificationStatusColors,
  CertificationStatusLabels,
  INDUSTRY_TYPE_OPTIONS,
  ORG_NATURE_OPTIONS,
  type AgencyCertification,
  type BusinessStatus,
} from '../../../types/agency'
import { nowStr } from '../../../utils'

/** 图片上传表单值 ⇄ 文件名互转（演示环境仅记录文件名，正式开发对接对象存储） */
function toFileList(url?: string) {
  return url ? [{ uid: url, name: url, status: 'done' as const }] : []
}
function fileListOf(value: unknown): string | undefined {
  const list = Array.isArray(value) ? value : (value as { fileList?: { name: string }[] } | null)?.fileList
  return list?.length ? list[0].name : undefined
}

/**
 * 设置中心 · 信息认证（原资质管理 + 旅行社资料合并）
 * 展示已提交审核通过的企业认证信息；可直接修改各项认证信息并重新提交审核，
 * 审核期间旧信息继续生效、系统所有功能正常使用
 */
export default function CertificationPage() {
  const { message } = App.useApp()
  const { agencyCertification, submitCertification, settleCertification, appendAgencyLog } = useStore()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const c = agencyCertification
  const pending = c.status === 'pending'

  // 表单回显：待审核时展示待审核内容（旧信息继续生效），其余展示当前生效信息
  useEffect(() => {
    const d: AgencyCertification = pending && c.pendingData ? { ...c, ...c.pendingData } : c
    form.setFieldsValue({
      ...d,
      region: regionToPath(d.region),
      legalPersonId: toFileList(d.legalPersonIdUrl),
      businessLicense: toFileList(d.businessLicenseUrl),
    })
  }, [c, pending, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const data: AgencyCertification = {
        ...c,
        ...values,
        region: pathToRegion(values.region),
        legalPersonIdUrl: fileListOf(values.legalPersonId),
        businessLicenseUrl: fileListOf(values.businessLicense),
      }
      submitCertification(data)
      appendAgencyLog({
        id: `L${Date.now()}`,
        agencyId: CURRENT_AGENCY.id,
        account: '李明',
        action: '提交信息认证审核',
        target: values.orgName,
        detail: '审核期间系统功能正常使用',
        createdAt: nowStr(),
      })
      message.success('已提交审核，审核期间系统所有功能均可正常使用')
    } catch {
      // 校验失败
    } finally {
      setSubmitting(false)
    }
  }

  // 上传位公共属性
  const uploadProps = {
    listType: 'picture-card' as const,
    maxCount: 1,
    beforeUpload: () => false,
    accept: 'image/*',
  }

  return (
    <>
      <PageHeader
        title="信息认证"
        breadcrumb={[{ title: '设置中心' }, { title: '信息认证' }]}
        extra={
          <Space>
            <Tag color={CertificationStatusColors[c.status]}>{CertificationStatusLabels[c.status]}</Tag>
            <span style={{ color: '#999' }}>最近认证通过时间：{c.verifiedAt ?? '—'}</span>
          </Space>
        }
      />
      <PageContainer>
        {pending && (
          <Alert
            type="info"
            showIcon
            message="信息认证审核中（当前认证信息继续生效）"
            description="以下为待审核的修改内容；审核期间产品管理、电子行程单等系统所有功能均可正常使用。"
            style={{ marginBottom: 16 }}
            action={
              // 演示环境：模拟平台侧审核结果（正式开发由平台侧触发）
              <Space>
                <Button size="small" onClick={() => { settleCertification('approved'); message.success('审核已通过，认证信息已更新') }}>
                  模拟审核通过
                </Button>
                <Button size="small" danger onClick={() => { settleCertification('rejected'); message.warning('认证被驳回') }}>
                  模拟驳回
                </Button>
              </Space>
            }
          />
        )}
        {c.status === 'rejected' && (
          <Alert
            type="error"
            showIcon
            message={`审核驳回：${c.rejectReason ?? '材料不符合要求'}`}
            description="原认证信息继续生效，可修改后重新提交审核，审核期间系统所有功能均可正常使用。"
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          disabled={pending}
          style={{ maxWidth: 1200, marginTop: 8 }}
        >
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="orgName" label="企业名称" rules={[{ required: true, message: '请输入企业名称' }]}>
                <Input maxLength={60} allowClear placeholder="请输入企业名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="shortName" label="简称">
                <Input maxLength={30} allowClear placeholder="请输入简称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="orgNature" label="企业性质" rules={[{ required: true, message: '请选择企业性质' }]}>
                <Select options={ORG_NATURE_OPTIONS.map((v) => ({ value: v, label: v }))} placeholder="请选择企业性质" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="legalPerson" label="法人" rules={[{ required: true, message: '请输入法人' }]}>
                <Input maxLength={20} allowClear placeholder="请输入法人" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="legalPersonPhone" label="法人电话" rules={[{ required: true, message: '请输入法人电话' }]}>
                <Input maxLength={20} allowClear placeholder="请输入法人电话" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="legalPersonIdNo" label="法人身份证" rules={[{ required: true, message: '请输入法人身份证号' }]}>
                <Input maxLength={18} allowClear placeholder="请输入法人身份证号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item
                name="creditCode"
                label="统一社会信用代码"
                rules={[
                  { required: true, message: '请输入统一社会信用代码' },
                  { pattern: /^[0-9A-HJ-NPQRTUWXY]{18}$/, message: '应为 18 位统一社会信用代码' },
                ]}
              >
                <Input maxLength={18} allowClear placeholder="请输入统一社会信用代码" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="licenseNo" label="经营许可证编号">
                <Input maxLength={30} allowClear placeholder="请输入经营许可证编号" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="industryType" label="产业类型">
                <Select options={INDUSTRY_TYPE_OPTIONS.map((v) => ({ value: v, label: v }))} placeholder="请选择产业类型" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="bankName" label="开户行">
                <Input maxLength={50} allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bankAccount" label="银行账号">
                <Input maxLength={30} allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bankBranchNo" label="行号">
                <Input maxLength={20} allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="contactName" label="联系人名字" rules={[{ required: true, message: '请输入联系人名字' }]}>
                <Input maxLength={20} allowClear placeholder="请输入联系人名字" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPhone" label="联系人电话" rules={[{ required: true, message: '请输入联系人电话' }]}>
                <Input maxLength={20} allowClear placeholder="请输入联系人电话" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="address" label="详细地址" rules={[{ required: true, message: '请输入详细地址' }]}>
                <Input maxLength={100} allowClear placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="businessScope" label="经营范围">
                <Input.TextArea rows={1} maxLength={200} placeholder="请输入经营范围" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item
                name="region"
                label="所属区域"
                rules={[{ required: true, message: '请选择所在区域至区/县' }]}
              >
                <Cascader options={GUIZHOU_REGION_OPTIONS} placeholder="请选择所在区域" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="businessStatus" label="营业状态">
            <Radio.Group
              options={(Object.keys(BusinessStatusLabels) as BusinessStatus[]).map((v) => ({ value: v, label: BusinessStatusLabels[v] }))}
            />
          </Form.Item>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="legalPersonId"
                label="法人身份证照片"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={[{ required: true, message: '请上传法人身份证照片' }]}
              >
                <Upload {...uploadProps}>
                  <div>
                    <FileImageOutlined />
                    <div style={{ marginTop: 8 }}>图片上传</div>
                  </div>
                </Upload>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="businessLicense"
                label="营业执照照片"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={[{ required: true, message: '请上传营业执照照片' }]}
              >
                <Upload {...uploadProps}>
                  <div>
                    <FileImageOutlined />
                    <div style={{ marginTop: 8 }}>图片上传</div>
                  </div>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
          <Row justify="end">
            {pending ? (
              <Button icon={<SafetyCertificateOutlined />} disabled>
                审核中
              </Button>
            ) : (
              <Button type="primary" loading={submitting} onClick={handleSubmit}>
                {c.status === 'rejected' ? '重新提交审核' : '提交审核'}
              </Button>
            )}
          </Row>
        </Form>
      </PageContainer>
    </>
  )
}
