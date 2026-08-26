// 旅游包车智慧监管 - 工具函数
import type {
  Vehicle,
  RiskEvent,
  RegionLevel,
} from '../types/coach-monitor'

/**
 * 按当前监管层级过滤数据（演示三级权限）
 * - province: 看全省
 * - city: 看本市
 * - county: 看本县
 * Mock 阶段简化处理：province 看全部；city 仅看 regionLevel=city 和 county；county 仅看 regionLevel=county
 */
export function filterByRegionLevel<T extends { regionLevel: RegionLevel }>(
  list: T[],
  level: RegionLevel,
): T[] {
  if (level === 'province') return list
  if (level === 'city') return list.filter((x) => x.regionLevel !== 'province')
  return list.filter((x) => x.regionLevel === 'county')
}

/** 按 regionLevel 过滤车辆 */
export const filterVehicles = (vehicles: Vehicle[], level: RegionLevel) =>
  filterByRegionLevel(vehicles, level)

/** 按 regionLevel 过滤事件 */
export const filterEvents = (events: RiskEvent[], level: RegionLevel) =>
  filterByRegionLevel(events, level)

/** 在线车辆数 */
export const onlineVehicleCount = (vehicles: Vehicle[]) =>
  vehicles.filter((v) => v.online).length

/** 今日事件数 */
export const todayEventCount = (events: RiskEvent[]) => {
  const today = new Date().toISOString().slice(0, 10)
  return events.filter((e) => e.occurredAt.startsWith(today)).length
}
