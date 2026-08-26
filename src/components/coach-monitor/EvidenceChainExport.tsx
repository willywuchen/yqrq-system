import { useState } from 'react'
import { Button, Modal, App, Typography, Tag, Spin } from 'antd'
import { DownloadOutlined, FileZipOutlined } from '@ant-design/icons'
import type { RiskEvent, EvidenceChain, VideoClip, Transcript, TrackPoint } from '../../types/coach-monitor'
import { ViolationCategoryLabels, RiskLevelLabels, RiskLevelColors } from '../../types/coach-monitor'

interface EvidenceChainExportProps {
  event: RiskEvent
  evidence?: EvidenceChain
  videoClips: VideoClip[]
  transcripts: Transcript[]
  trackPoints: TrackPoint[]
}

/**
 * 证据链导出组件
 * - 弹窗预览证据链内容
 * - Mock 下载（生成 JSON 文件）
 */
export default function EvidenceChainExport({
  event,
  evidence,
  videoClips,
  transcripts,
  trackPoints,
}: EvidenceChainExportProps) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const { message } = App.useApp()

  const handleExport = () => {
    setDownloading(true)
    setTimeout(() => {
      const payload = {
        证据链编号: evidence?.evidenceId || `EV-PREVIEW-${event.eventId}`,
        事件编号: event.eventId,
        车牌号: event.plateNo,
        旅行社: event.travelAgencyName,
        违规类别: ViolationCategoryLabels[event.category],
        风险等级: RiskLevelLabels[event.riskLevel],
        命中规则: event.ruleName,
        命中关键词: event.hitKeywords,
        发生时间: event.occurredAt,
        发生地点: event.regionName,
        视频片段: videoClips.map((c) => ({
          编号: c.clipId,
          通道: c.channelId,
          起止时间: `${c.startTime} ~ ${c.endTime}`,
          地址: c.url || '(待对接)',
        })),
        语音文字稿: transcripts.map((t) => ({
          编号: t.transcriptId,
          时间: `${t.startTime} ~ ${t.endTime}`,
          内容: t.text,
          命中关键词: t.keywords || [],
        })),
        轨迹点: trackPoints.map((t) => ({
          时间: t.timestamp,
          经纬度: `${t.lng},${t.lat}`,
          位置: t.location || '',
          速度: t.speed,
        })),
        归档人: evidence?.archivedBy || event.handledBy,
        归档时间: evidence?.archivedAt || event.handleTime,
        备注: evidence?.note || event.handleNote,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `证据链_${event.eventId}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setDownloading(false)
      setOpen(false)
      message.success('证据链已导出')
    }, 600)
  }

  return (
    <>
      <Button icon={<DownloadOutlined />} onClick={() => setOpen(true)}>
        导出证据链
      </Button>
      <Modal
        title={
          <span>
            <FileZipOutlined /> 证据链预览 - {event.eventId}
          </span>
        }
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleExport}
        okText="确认导出"
        cancelText="取消"
        width={720}
        okButtonProps={{ loading: downloading }}
      >
        {downloading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin tip="打包证据中..." />
          </div>
        ) : (
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            <Typography.Paragraph>
              <strong>事件信息</strong>
            </Typography.Paragraph>
            <div style={{ background: '#fafafa', padding: 12, marginBottom: 16, borderRadius: 4 }}>
              <div style={{ marginBottom: 8 }}>
                车牌号：<strong>{event.plateNo}</strong> · 旅行社：{event.travelAgencyName}
              </div>
              <div style={{ marginBottom: 8 }}>
                违规类别：
                <Tag color={RiskLevelColors[event.riskLevel]}>
                  {ViolationCategoryLabels[event.category]} · {RiskLevelLabels[event.riskLevel]}
                </Tag>
              </div>
              <div style={{ marginBottom: 8 }}>命中规则：{event.ruleName}</div>
              <div style={{ marginBottom: 8 }}>
                命中关键词：
                {event.hitKeywords.map((k) => (
                  <Tag color="red" key={k} style={{ margin: '0 4px 4px 0' }}>
                    {k}
                  </Tag>
                ))}
              </div>
              <div>
                发生时间：{event.occurredAt} · 地点：{event.regionName}
              </div>
            </div>

            <Typography.Paragraph>
              <strong>视频片段（{videoClips.length}）</strong>
            </Typography.Paragraph>
            {videoClips.length === 0 ? (
              <div style={{ color: '#999', marginBottom: 16 }}>该事件暂无关联视频片段</div>
            ) : (
              videoClips.map((c) => (
                <Tag color="blue" key={c.clipId} style={{ margin: '0 8px 8px 0' }}>
                  {c.startTime} ~ {c.endTime}
                </Tag>
              ))
            )}

            <Typography.Paragraph>
              <strong>语音文字稿（{transcripts.length}）</strong>
            </Typography.Paragraph>
            {transcripts.length === 0 ? (
              <div style={{ color: '#999', marginBottom: 16 }}>无关联文字稿</div>
            ) : (
              transcripts.map((t) => (
                <div
                  key={t.transcriptId}
                  style={{
                    background: '#fafafa',
                    padding: 8,
                    marginBottom: 8,
                    borderRadius: 4,
                    borderLeft: '3px solid #1677ff',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                    {t.startTime} ~ {t.endTime}
                  </div>
                  <div>{t.text}</div>
                </div>
              ))
            )}

            <Typography.Paragraph>
              <strong>轨迹点（{trackPoints.length}）</strong>
            </Typography.Paragraph>
            {trackPoints.length === 0 ? (
              <div style={{ color: '#999' }}>无关联轨迹</div>
            ) : (
              <div style={{ fontSize: 12, color: '#666' }}>
                {trackPoints.slice(0, 5).map((t) => (
                  <div key={t.trackId}>
                    {t.timestamp} · {t.location || `${t.lng.toFixed(4)}, ${t.lat.toFixed(4)}`}
                  </div>
                ))}
                {trackPoints.length > 5 && <div>... 共 {trackPoints.length} 个轨迹点</div>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
