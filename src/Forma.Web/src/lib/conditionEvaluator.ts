/**
 * conditionEvaluator - 共用條件評估工具
 * 支援 SingleConditional 和 MultiConditional (AND/OR)
 */

import type {
  Conditional,
  Condition,
  ConditionalOperator,
} from '@/types/form';
import { isMultiConditional, isSingleConditional } from '@/types/form';

/**
 * 評估單一運算符
 */
export function evaluateOperator(
  fieldValue: unknown,
  operator: ConditionalOperator,
  ruleValue?: unknown,
): boolean {
  const strValue = String(fieldValue ?? '');
  const numValue = Number(fieldValue);
  const ruleStrValue = String(ruleValue ?? '');
  const ruleNumValue = Number(ruleValue);

  switch (operator) {
    case 'equals':
      return strValue === ruleStrValue;
    case 'notEquals':
      return strValue !== ruleStrValue;
    case 'contains':
      return strValue.includes(ruleStrValue);
    case 'notContains':
      return !strValue.includes(ruleStrValue);
    case 'gt':
      return !isNaN(numValue) && numValue > ruleNumValue;
    case 'gte':
      return !isNaN(numValue) && numValue >= ruleNumValue;
    case 'lt':
      return !isNaN(numValue) && numValue < ruleNumValue;
    case 'lte':
      return !isNaN(numValue) && numValue <= ruleNumValue;
    case 'isEmpty':
      return strValue === '' || fieldValue === null || fieldValue === undefined;
    case 'isNotEmpty':
      return strValue !== '' && fieldValue !== null && fieldValue !== undefined;
    case 'in':
      return ruleStrValue.split(',').map((s) => s.trim()).includes(strValue);
    case 'notIn':
      return !ruleStrValue.split(',').map((s) => s.trim()).includes(strValue);
    case 'startsWith':
      return strValue.startsWith(ruleStrValue);
    case 'endsWith':
      return strValue.endsWith(ruleStrValue);
    default:
      return false;
  }
}

/**
 * 評估單一條件
 */
export function evaluateCondition(
  condition: Condition,
  values: Record<string, unknown>,
): boolean {
  const fieldValue = values[condition.field];
  return evaluateOperator(fieldValue, condition.operator, condition.value);
}

/**
 * 評估欄位是否可見（同時考慮 field.visible 和 field.conditional）
 * 若有 conditional，以 conditional 結果為準（優先於 visible）
 * 若無 conditional，以 visible 旗標為準（預設 true）
 */
export function isFieldVisible(
  field: { visible?: boolean; conditional?: Conditional },
  values: Record<string, unknown>,
): boolean {
  // 若有條件設定，以條件結果為準
  if (field.conditional) {
    return evaluateConditional(field.conditional, values);
  }
  // 無條件時，以 visible 旗標為準
  return field.visible !== false;
}

/**
 * 評估頁面是否可見（同時考慮 page.visible 和 page.visibilityCondition）
 * 邏輯同 isFieldVisible：有條件時以條件為準，無條件時以 visible 旗標為準
 */
export function isPageVisible(
  page: { visible?: boolean; visibilityCondition?: Conditional },
  values: Record<string, unknown>,
): boolean {
  if (page.visibilityCondition) {
    return evaluateConditional(page.visibilityCondition, values);
  }
  return page.visible !== false;
}

/**
 * 評估 Conditional（單一或多條件），回傳是否可見
 * action='show' → 條件成立則可見
 * action='hide' → 條件成立則隱藏
 */
export function evaluateConditional(
  conditional: Conditional | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!conditional) return true;

  let conditionMet: boolean;

  if (isSingleConditional(conditional)) {
    conditionMet = evaluateCondition(conditional.when, values);
  } else if (isMultiConditional(conditional)) {
    const { logicType, conditions } = conditional;
    if (!conditions || conditions.length === 0) return true;

    if (logicType === 'and') {
      conditionMet = conditions.every((c) => evaluateCondition(c, values));
    } else {
      conditionMet = conditions.some((c) => evaluateCondition(c, values));
    }
  } else {
    return true;
  }

  const action = conditional.action;
  if (action === 'show') {
    return conditionMet;
  } else if (action === 'hide') {
    return !conditionMet;
  }

  // For other actions (enable/disable/require/unrequire), treat as visible
  return true;
}
