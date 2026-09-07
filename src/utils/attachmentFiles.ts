// 附件原始文件的内存登记表
// 当前系统为纯前端 mock 模式（无后端存储），上传的附件只保存元信息；
// 这里按 uid 暂存浏览器中的原始 File 对象，供"打包移交"时把真实文件内容写入压缩包。
const registry = new Map<string, File>()

export function putAttachmentFile(uid: string, file: File) {
  registry.set(uid, file)
}

export function getAttachmentFile(uid: string): File | undefined {
  return registry.get(uid)
}

export function removeAttachmentFile(uid: string) {
  registry.delete(uid)
}

// 生成唯一附件 uid（Date.now 在连传多个文件时会重复）
export function genAttachmentUid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
