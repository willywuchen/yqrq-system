// 业务规则校验（对齐政策附件2）
import dayjs from 'dayjs';
import type { Application, RewardCategory, RewardMajor } from '../types';
import {
  CategoryToMajor,
  POLICY_CONSTANTS,
  RewardMajorLabels,
} from '../types';

// ========== 互斥校验 ==========
/**
 * 政策第八条：企业只能选择一项进行申报（三大类互斥）
 * 政策第十一条：专项奖励一次只能选择其中一项奖项申报（专项内部互斥）
 *
 * 校验逻辑：
 * - 同一企业同一年度，已存在某大类的"非草稿/非拒绝"申报时，不能再申报其他大类
 * - 同一企业同一年度，已存在"专项奖励"中某子类的"非草稿/非拒绝"申报时，不能再申报专项奖励的其他子类
 */
export interface MutexCheckResult {
  ok: boolean;
  reason?: string;
  conflictMajor?: RewardMajor;
  conflictAppName?: string;
}

const activeStatuses = [
  'pending_initial',
  'initialing',
  'initial_returned',
  'pending_review',
  'reviewing',
  'review_returned',
  'pending_final',
  'finaling',
  'publicizing',
  'pending_payment',
  'paid',
  'pre_check_pending',
  'pre_check_passed',
];

export function checkCategoryMutex(
  newCategory: RewardCategory,
  existingApps: Application[],
  excludeId?: string,
): MutexCheckResult {
  const newMajor = CategoryToMajor[newCategory];
  if (!newMajor) return { ok: true };

  // 三大类互斥
  const otherMajorApps = existingApps.filter(
    (a) =>
      a.id !== excludeId &&
      activeStatuses.includes(a.status) &&
      CategoryToMajor[a.category] &&
      CategoryToMajor[a.category] !== newMajor,
  );
  if (otherMajorApps.length > 0) {
    const conflict = otherMajorApps[0];
    return {
      ok: false,
      reason: `政策第八条规定企业只能选择一项进行申报。您已存在「${RewardMajorLabels[CategoryToMajor[conflict.category]!] }」类申报（${conflict.id}），不可再申报其他大类。`,
      conflictMajor: CategoryToMajor[conflict.category],
      conflictAppName: conflict.id,
    };
  }

  // 专项奖励内部单项互斥
  if (newMajor === 'special_tourism') {
    const otherSpecialApps = existingApps.filter(
      (a) =>
        a.id !== excludeId &&
        activeStatuses.includes(a.status) &&
        CategoryToMajor[a.category] === 'special_tourism' &&
        a.category !== newCategory,
    );
    if (otherSpecialApps.length > 0) {
      const conflict = otherSpecialApps[0];
      return {
        ok: false,
        reason: `政策第十一条规定专项奖励一次只能选择其中一项奖项申报。您已存在其他专项奖励申报（${conflict.id}），不可再申报本子项。`,
        conflictAppName: conflict.id,
      };
    }
  }

  return { ok: true };
}

// ========== 次数限制校验 ==========
/**
 * 政策第十二条（二）：请进来奖励同一企业每年不超过4次
 * 政策第十二条（四）：交流合作奖励同一企业每年不超过4次
 */
export interface TimesCheckResult {
  ok: boolean;
  used: number;
  limit: number;
  reason?: string;
}

export function checkTimesLimit(
  newCategory: RewardCategory,
  existingApps: Application[],
  year: number = 2026,
  excludeId?: string,
): TimesCheckResult {
  let limit = 0;
  if (newCategory === 'culture_invite_in') {
    limit = POLICY_CONSTANTS.inviteInMaxPerYear;
  } else if (newCategory === 'culture_exchange') {
    limit = POLICY_CONSTANTS.exchangeMaxPerYear;
  } else {
    return { ok: true, used: 0, limit: 0 };
  }

  // 统计当年已申报次数（含草稿外的所有状态）
  const used = existingApps.filter(
    (a) =>
      a.id !== excludeId &&
      a.category === newCategory &&
      a.status !== 'rejected' &&
      a.status !== 'archived' &&
      a.createTime.startsWith(String(year)),
  ).length;

  if (used >= limit) {
    return {
      ok: false,
      used,
      limit,
      reason: `政策第十二条规定同一企业每年申请该奖励不超过${limit}次，您本年度已申请${used}次，不可再申报。`,
    };
  }

  return { ok: true, used, limit };
}

// ========== 截止日期校验 ==========
/**
 * 政策第十三条/十四条/十五条：
 * - 行程结束后45天内提交申请
 * - 所有申报材料递交最终截止时间：2027年1月31日
 */
export interface DeadlineCheckResult {
  ok: boolean;
  reason?: string;
  finalDeadline?: string;
  submitDeadline?: string;
}

export function checkSubmitDeadline(travelEnd?: string, submitTime: string = dayjs().format('YYYY-MM-DD HH:mm:ss')): DeadlineCheckResult {
  // 最终截止日期校验
  const finalDeadline = dayjs(POLICY_CONSTANTS.finalDeadline).endOf('day');
  if (dayjs(submitTime).isAfter(finalDeadline)) {
    return {
      ok: false,
      reason: `所有申报材料递交最终截止时间为 ${POLICY_CONSTANTS.finalDeadline}，已逾期，不再受理申报材料。`,
      finalDeadline: POLICY_CONSTANTS.finalDeadline,
    };
  }

  // 行程结束后45天内提交
  if (travelEnd) {
    const travelEndDate = dayjs(travelEnd);
    const submitDeadline = travelEndDate.add(POLICY_CONSTANTS.submitAfterTravelDays, 'day');
    if (dayjs(submitTime).isAfter(submitDeadline)) {
      return {
        ok: false,
        reason: `政策规定行程结束后${POLICY_CONSTANTS.submitAfterTravelDays}天内提交申请，行程结束日为 ${travelEnd}，提交截止日为 ${submitDeadline.format('YYYY-MM-DD')}，已逾期将被视为自动放弃奖励。`,
        submitDeadline: submitDeadline.format('YYYY-MM-DD'),
      };
    }
    return {
      ok: true,
      submitDeadline: submitDeadline.format('YYYY-MM-DD'),
      finalDeadline: POLICY_CONSTANTS.finalDeadline,
    };
  }

  return { ok: true, finalDeadline: POLICY_CONSTANTS.finalDeadline };
}

// ========== 团组去重校验 ==========
/**
 * 政策第十一条：对于乘坐同一航班或高铁、巴士等同一时间抵离贵州，
 * 在贵州省行程和住宿一致的，将被视为同一团组，不能拆分后申请。
 */
export interface DuplicateCheckResult {
  ok: boolean;
  reason?: string;
  conflictAppName?: string;
}

export function checkTeamDuplicate(
  newApp: Partial<Application>,
  existingApps: Application[],
  excludeId?: string,
): DuplicateCheckResult {
  // 仅对专项奖励校验
  if (!newApp.category || CategoryToMajor[newApp.category] !== 'special_tourism') {
    return { ok: true };
  }

  const flightNo = newApp.flightNo?.trim();
  const trainNo = newApp.trainNo?.trim();
  const travelStart = newApp.travelStart;
  const travelEnd = newApp.travelEnd;

  if (!flightNo && !trainNo) return { ok: true };

  const conflict = existingApps.find((a) => {
    if (a.id === excludeId) return false;
    if (CategoryToMajor[a.category] !== 'special_tourism') return false;
    if (!activeStatuses.includes(a.status)) return false;
    // 同航班+同行程
    if (flightNo && a.flightNo?.trim() === flightNo && a.travelStart === travelStart && a.travelEnd === travelEnd) {
      return true;
    }
    // 同车次+同行程
    if (trainNo && a.trainNo?.trim() === trainNo && a.travelStart === travelStart && a.travelEnd === travelEnd) {
      return true;
    }
    return false;
  });

  if (conflict) {
    return {
      ok: false,
      reason: `政策第十一条规定：同一航班或高铁、巴士等同一时间抵离贵州，在贵州省行程和住宿一致的，将被视为同一团组，不能拆分后申请。已存在相同团组的申报：${conflict.id}。`,
      conflictAppName: conflict.id,
    };
  }

  return { ok: true };
}

// ========== 团队接待奖励：最少10人校验 ==========
/**
 * 政策第十条：须满足该团为10人（含）以上持港澳台居民来往内地通行证或持外国护照的游客
 */
export function checkTeamReceptionSize(teamSize: number): { ok: boolean; reason?: string } {
  if (teamSize < POLICY_CONSTANTS.teamReceptionMinSize) {
    return {
      ok: false,
      reason: `政策第十条规定：入境旅游团队接待奖励须满足该团为${POLICY_CONSTANTS.teamReceptionMinSize}人（含）以上持港澳台居民来往内地通行证或持外国护照的游客。`,
    };
  }
  return { ok: true };
}

// ========== 景区数量校验 ==========
/**
 * 政策附件2-1-④：至少2个4A+景区
 */
export function checkScenicCount(scenicCount: number): { ok: boolean; reason?: string } {
  if (scenicCount < POLICY_CONSTANTS.minScenicCount) {
    return {
      ok: false,
      reason: `政策附件2要求提供至少 ${POLICY_CONSTANTS.minScenicCount} 个 4A（含）以上景区相关证明，当前仅 ${scenicCount} 个。`,
    };
  }
  return { ok: true };
}

// ========== 综合校验入口 ==========
export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateApplication(
  newApp: Partial<Application>,
  existingApps: Application[],
  excludeId?: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!newApp.category) {
    errors.push('请选择奖励类别');
    return { ok: false, errors, warnings };
  }

  // 1. 互斥校验
  const mutex = checkCategoryMutex(newApp.category, existingApps, excludeId);
  if (!mutex.ok && mutex.reason) errors.push(mutex.reason);

  // 2. 次数限制校验
  const times = checkTimesLimit(newApp.category, existingApps, 2026, excludeId);
  if (!times.ok && times.reason) errors.push(times.reason);
  else if (times.limit > 0 && times.used >= times.limit - 1) {
    warnings.push(`本年度已申请 ${times.used} 次，剩余 ${times.limit - times.used} 次申请额度`);
  }

  // 3. 团组去重校验
  const dup = checkTeamDuplicate(newApp, existingApps, excludeId);
  if (!dup.ok && dup.reason) errors.push(dup.reason);

  // 4. 截止日期校验
  const deadline = checkSubmitDeadline(newApp.travelEnd);
  if (!deadline.ok && deadline.reason) {
    errors.push(deadline.reason);
  } else if (deadline.submitDeadline) {
    warnings.push(`请在行程结束后${POLICY_CONSTANTS.submitAfterTravelDays}天内（即 ${deadline.submitDeadline} 前）提交申请；最终截止日 ${POLICY_CONSTANTS.finalDeadline}`);
  }

  // 5. 团队接待奖励：最少10人
  if (newApp.category === 'team_reception' && newApp.teamSize) {
    const size = checkTeamReceptionSize(newApp.teamSize);
    if (!size.ok && size.reason) errors.push(size.reason);
  }

  // 6. 景区数量
  if (newApp.scenics && newApp.scenics.length > 0) {
    const scenic = checkScenicCount(newApp.scenics.length);
    if (!scenic.ok && scenic.reason) errors.push(scenic.reason);
  }

  return { ok: errors.length === 0, errors, warnings };
}
