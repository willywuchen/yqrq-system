import { useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  message,
  Row,
  Col,
  Tag,
  Space,
  Descriptions,
  Alert,
  Typography,
  Table,
} from 'antd'
import {
  UploadOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  BankOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { POLICY_CONSTANTS, type Attachment } from '../../types'
import { formatFileSize, genId, nowStr } from '../../utils'

const { Text } = Typography

export default function EnterpriseProfile() {
  const { enterpriseProfile, setEnterpriseProfile, currentUser } = useStore()
  const [form] = Form.useForm()
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState(enterpriseProfile)

  // 上传单个档案材料
  const handleUpload = (field: 'businessLicense' | 'travelLicense' | 'legalRepId') => (file: File) => {
    const isLt20M = file.size / 1024 / 1024 < 20
    if (!isLt20M) {
      message.error('文件不能超过 20MB!')
      return Upload.LIST_IGNORE
    }
    const att: Attachment = {
      uid: genId('file'),
      name: file.name,
      size: file.size,
      type: file.type || file.name.split('.').pop() || '',
      uploadTime: nowStr(),
    }
    const newProfile = { ...profile, [field]: att }
    setProfile(newProfile)
    setEnterpriseProfile(newProfile)
    message.success(`${file.name} 上传成功，已存入企业资质档案`)
    return false
  }

  // 删除档案
  const handleRemove = (field: 'businessLicense' | 'travelLicense' | 'legalRepId') => {
    const newProfile = { ...profile, [field]: undefined }
    setProfile(newProfile)
    setEnterpriseProfile(newProfile)
    message.success('已删除档案材料')
  }

  // 保存企业名称
  const handleSave = () => {
    form.validateFields().then((values) => {
      const newProfile = { ...profile, orgName: values.orgName }
      setProfile(newProfile)
      setEnterpriseProfile(newProfile)
      setEditing(false)
      message.success('企业资质档案已保存')
    })
  }

  const archives = [
    {
      key: 'businessLicense' as const,
      title: '企业营业执照',
      icon: <BankOutlined />,
      desc: '加盖单位公章的营业执照复印件',
      value: profile.businessLicense,
      required: true,
    },
    {
      key: 'travelLicense' as const,
      title: '旅行社业务经营许可证',
      icon: <SafetyCertificateOutlined />,
      desc: '加盖单位公章的旅行社业务经营许可证复印件',
      value: profile.travelLicense,
      required: true,
    },
    {
      key: 'legalRepId' as const,
      title: '法定代表人身份证',
      icon: <IdcardOutlined />,
      desc: '加盖单位公章的法定代表人身份证复印件',
      value: profile.legalRepId,
      required: true,
    },
  ]

  const archiveStats = {
    total: archives.length,
    uploaded: archives.filter((a) => a.value).length,
  }

  return (
    <>
      <PageHeader
        title="企业资质档案"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '企业资质档案' },
        ]}
        extra={
          !editing ? (
            <Button type="primary" onClick={() => { form.setFieldsValue({ orgName: profile.orgName }); setEditing(true) }}>
              编辑企业信息
            </Button>
          ) : (
            <Space>
              <Button onClick={() => setEditing(false)}>取消</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                保存
              </Button>
            </Space>
          )
        }
      />
      <PageContainer>
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message="企业资质档案说明"
          description="企业资质档案用于存储每次申报奖励均需提交的基础材料（营业执照、旅行社业务经营许可证、法定代表人身份证）。一次存档，多次调用，避免重复上传。注意：完税凭证和「信用中国」查询截图需每次申报当日上传（实时性要求），不可预存。"
          style={{ marginBottom: 16 }}
        />

        {/* 完整度提示 */}
        <Card size="small" style={{ marginBottom: 16, background: archiveStats.uploaded === archiveStats.total ? '#f6ffed' : '#fffbe6', border: archiveStats.uploaded === archiveStats.total ? '1px solid #b7eb8f' : '1px solid #ffe58f' }}>
          <Space>
            {archiveStats.uploaded === archiveStats.total ? (
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            ) : (
              <InfoCircleOutlined style={{ color: '#faad14', fontSize: 18 }} />
            )}
            <Text strong>
              档案完整度：{archiveStats.uploaded}/{archiveStats.total}
            </Text>
            {archiveStats.uploaded === archiveStats.total ? (
              <Tag color="success">档案完整，可直接调用</Tag>
            ) : (
              <Tag color="warning">尚有 {archiveStats.total - archiveStats.uploaded} 项未上传，建议补全</Tag>
            )}
          </Space>
        </Card>

        {/* 企业基本信息 */}
        <Card title="企业基本信息" size="small" style={{ marginBottom: 16 }}>
          {editing ? (
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="企业名称"
                    name="orgName"
                    rules={[{ required: true, message: '请输入企业名称' }]}
                  >
                    <Input placeholder="如：贵州阳光国际旅行社" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="当前用户">
                    <Input value={currentUser.name} disabled />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          ) : (
            <Descriptions column={2} size="small">
              <Descriptions.Item label="企业名称">
                <Text strong>{profile.orgName || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="当前用户">
                {currentUser.name}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        {/* 档案材料管理 */}
        <Card title="档案材料管理（基础材料预存）" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            {archives.map((arc) => (
              <Col xs={24} md={8} key={arc.key}>
                <Card
                  size="small"
                  title={
                    <Space>
                      {arc.icon}
                      <span>{arc.title}</span>
                      {arc.required && <Tag color="red">必传</Tag>}
                      {arc.value && <Tag color="success">已存档</Tag>}
                    </Space>
                  }
                  styles={{ body: { padding: 16, minHeight: 180 } }}
                >
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                    {arc.desc}
                  </Text>
                  {arc.value ? (
                    <div>
                      <Table
                        dataSource={[arc.value]}
                        rowKey="uid"
                        size="small"
                        pagination={false}
                        columns={[
                          { title: '文件名', dataIndex: 'name', ellipsis: true },
                          { title: '大小', dataIndex: 'size', width: 80, render: (s: number) => formatFileSize(s) },
                        ]}
                      />
                      <div style={{ marginTop: 8, textAlign: 'right' }}>
                        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemove(arc.key)}>
                          删除
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Upload.Dragger
                      beforeUpload={handleUpload(arc.key)}
                      multiple={false}
                      showUploadList={false}
                      style={{ padding: 12 }}
                    >
                      <p>
                        <UploadOutlined style={{ fontSize: 28, color: '#1677ff' }} />
                      </p>
                      <p style={{ fontSize: 12 }}>点击或拖拽上传{arc.title}</p>
                      <p style={{ color: '#999', fontSize: 11 }}>支持 PDF/JPG/PNG，≤20MB</p>
                    </Upload.Dragger>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 每次申报必传但不可预存的材料提示 */}
        <Card title="需每次申报当日上传的材料（不可预存）" size="small" style={{ marginBottom: 16 }}>
          <Alert
            type="warning"
            showIcon
            message="实时性材料"
            description={
              <div>
                <div style={{ marginBottom: 8 }}>
                  以下材料因有时效性要求，需在每次申报当日上传：
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>
                    <Text strong>税务部门出具的上月/季度税收完税凭证</Text>
                    <Text type="secondary">（加盖公章）</Text>
                  </li>
                  <li>
                    <Text strong>"信用中国"网站查询截图</Text>
                    <Text type="secondary">（查询时点为提交资料当日，加盖公章）</Text>
                  </li>
                </ul>
                <div style={{ marginTop: 12 }}>
                  <a href={POLICY_CONSTANTS.creditChinaUrl} target="_blank" rel="noreferrer">
                    <Button type="link" size="small" icon={<LinkOutlined />}>
                      打开信用中国查询（{POLICY_CONSTANTS.creditChinaUrl}）
                    </Button>
                  </a>
                </div>
              </div>
            }
          />
        </Card>

        {/* 使用说明 */}
        <Card title="使用说明" size="small">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="调用方式">
              在新建申报页"基础材料"区，系统会自动检测企业资质档案，已存档的材料可直接调用，无需重复上传。
            </Descriptions.Item>
            <Descriptions.Item label="更新档案">
              如企业资质信息变更（如换证、变更法人等），请及时更新档案，避免影响申报。
            </Descriptions.Item>
            <Descriptions.Item label="档案效力">
              企业资质档案仅作为申报时的便利化工具，最终审核以申报时上传的加盖公章复印件为准。
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </PageContainer>
    </>
  )
}
