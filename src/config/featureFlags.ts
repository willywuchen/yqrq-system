import type { UserRole } from '../types'

// 功能开关：是否显示"引客入黔奖励管理"模块
// 关闭时仅隐藏入口（菜单、路由、首页工作台、顶栏铃铛），相关代码全部保留；
// 需要恢复显示时，改回 true 即可
export const REWARD_MODULE_ENABLED = false

// 功能开关：顶栏用户切换下拉中临时隐藏的角色（第三方初审员、市州复审员）
// 这两个角色仅有奖励管理菜单，模块隐藏后无可用功能；恢复时把数组清空即可
export const HIDDEN_USER_ROLES: UserRole[] = ['initial_reviewer', 'review_reviewer']

// 功能开关：是否显示舆情模块下的"风险预警"、"舆情报告"菜单
// 关闭时仅隐藏入口（菜单、页面按钮），相关页面与代码全部保留；
// 需要恢复显示时，改回 true 即可
export const OPINION_WARNING_REPORT_ENABLED = false

// 功能开关：公告模块的"已读率/已读统计"功能
// 关闭时隐藏管理列表的已读率列与「已读统计」入口（统计抽屉等代码全部保留）；
// 阅读记录本身不受影响（未读红点、强制阅读提醒仍正常工作）；
// 需要恢复时改回 true 即可
export const ANNOUNCEMENT_READ_STATS_ENABLED = false
