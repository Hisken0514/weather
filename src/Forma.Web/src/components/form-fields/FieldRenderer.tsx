/**
 * FieldRenderer - 欄位渲染器
 * 根據欄位類型自動選擇對應的組件進行渲染
 */

import type { Field } from '@/types/form';
import { FormTextField } from './FormTextField';
import { FormNumberField } from './FormNumberField';
import { FormSelectField } from './FormSelectField';
import { FormBooleanField } from './FormBooleanField';
import { FormRatingField } from './FormRatingField';
import { FormDateTimeField } from './FormDateTimeField';
import { FormFileField } from './FormFileField';
import { FormSignatureField } from './FormSignatureField';
import { FormImagePickerField } from './FormImagePickerField';
import { FormRankingField } from './FormRankingField';
import { FormMultipleTextField } from './FormMultipleTextField';
import { FormMatrixField } from './FormMatrixField';
import { FormMatrixDropdownField } from './FormMatrixDropdownField';
import { FormMatrixDynamicField } from './FormMatrixDynamicField';
import { FormPanelField } from './FormPanelField';
import { FormPanelDynamicField } from './FormPanelDynamicField';
import { FormHtmlField } from './FormHtmlField';
import { FormExpressionField } from './FormExpressionField';
import { FormCascadingSelectField } from './FormCascadingSelectField';
import { FormWelcomeField } from './FormWelcomeField';
import { FormEndingField } from './FormEndingField';
import { FormDownloadReportField } from './FormDownloadReportField';
import { Box, Typography } from '@mui/material';
import type { FormSchema } from '@/types/form';

interface FieldRendererProps {
  field: Field;
  /** 全域設定：所有欄位設為必填 */
  allFieldsRequired?: boolean;
  /** 傳入 schema 供下載報告欄位使用 */
  schema?: FormSchema;
  /** 計畫 Logo URL */
  logoUrl?: string;
}

export function FieldRenderer({ field, allFieldsRequired, schema, logoUrl }: FieldRendererProps) {
  // Apply global required setting
  const effectiveField = allFieldsRequired
    ? { ...field, required: true }
    : field;
  // 根據欄位類型渲染對應組件
  switch (effectiveField.type) {
    // 文字輸入類
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'url':
    case 'password':
      return <FormTextField field={effectiveField} />;

    // 多重文字輸入
    case 'multipletext':
      return <FormMultipleTextField field={effectiveField} />;

    // 數值輸入類
    case 'number':
    case 'slider':
      return <FormNumberField field={effectiveField} />;

    // 選擇類
    case 'select':
    case 'multiselect':
    case 'radio':
    case 'checkbox':
      return <FormSelectField field={effectiveField} />;

    // 布林類
    case 'boolean':
      return <FormBooleanField field={effectiveField} />;

    // 圖片選擇
    case 'imagepicker':
      return <FormImagePickerField field={effectiveField} />;

    // 排序
    case 'ranking':
      return <FormRankingField field={effectiveField} />;

    // 階層選單
    case 'cascadingselect':
      return <FormCascadingSelectField field={effectiveField} />;

    // 評分類
    case 'rating':
      return <FormRatingField field={effectiveField} />;

    // 日期時間類
    case 'date':
    case 'time':
    case 'datetime':
      return <FormDateTimeField field={effectiveField} />;

    // 檔案上傳類
    case 'file':
    case 'image':
      return <FormFileField field={effectiveField} />;

    // 簽名
    case 'signature':
      return <FormSignatureField field={effectiveField} />;

    // 矩陣類
    case 'matrix':
      return <FormMatrixField field={effectiveField} />;

    case 'matrixdropdown':
      return <FormMatrixDropdownField field={effectiveField} />;

    case 'matrixdynamic':
      return <FormMatrixDynamicField field={effectiveField} />;

    // 面板類
    case 'panel':
      return <FormPanelField field={effectiveField} allFieldsRequired={allFieldsRequired} />;

    case 'section':
      return (
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          sx={{
            py: 1,
            borderBottom: '2px solid',
            borderColor: 'primary.main',
            '& b, & strong': { fontWeight: 700 },
            '& i, & em': { fontStyle: 'italic' },
            '& u': { textDecoration: 'underline' },
          }}
          dangerouslySetInnerHTML={{ __html: effectiveField.label || effectiveField.name }}
        />
      );

    case 'paneldynamic':
      return <FormPanelDynamicField field={effectiveField} allFieldsRequired={allFieldsRequired} />;

    // HTML 內容
    case 'html':
      return <FormHtmlField field={effectiveField} />;

    // 計算欄位
    case 'expression':
      return <FormExpressionField field={effectiveField} />;

    // 歡迎區塊
    case 'welcome':
      return <FormWelcomeField field={effectiveField} />;

    // 結束區塊
    case 'ending':
      return <FormEndingField field={effectiveField} />;

    // 下載報告
    case 'downloadreport':
      return <FormDownloadReportField field={effectiveField} schema={schema} logoUrl={logoUrl} />;

    // 隱藏欄位
    case 'hidden':
      return null;

    // 尚未實作的類型
    default:
      return (
        <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
          <Typography color="textSecondary">
            尚未實作的欄位類型: {(effectiveField as Field).type}
          </Typography>
        </Box>
      );
  }
}

export default FieldRenderer;
