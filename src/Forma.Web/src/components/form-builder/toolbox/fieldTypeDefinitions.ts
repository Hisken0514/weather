/**
 * Field Type Definitions - Metadata and icons for all field types
 */

import type { FieldType } from '@/types/form';

export interface FieldTypeDefinition {
  type: FieldType;
  label: string;
  icon: string; // Material icon name
  category: FieldCategory;
  description: string;
  defaultProperties?: Record<string, unknown>;
}

export type FieldCategory =
  | 'text'
  | 'number'
  | 'choice'
  | 'datetime'
  | 'file'
  | 'matrix'
  | 'layout'
  | 'special';

export interface FieldCategoryInfo {
  id: FieldCategory;
  label: string;
  icon: string;
}

export const fieldCategories: FieldCategoryInfo[] = [
  { id: 'text', label: '文字輸入', icon: 'TextFields' },
  { id: 'number', label: '數值輸入', icon: 'Numbers' },
  { id: 'choice', label: '選擇類', icon: 'CheckBox' },
  { id: 'datetime', label: '日期時間', icon: 'CalendarMonth' },
  { id: 'file', label: '檔案與媒體', icon: 'AttachFile' },
  { id: 'matrix', label: '矩陣表格', icon: 'GridOn' },
  { id: 'layout', label: '版面配置', icon: 'ViewQuilt' },
  { id: 'special', label: '特殊欄位', icon: 'Extension' },
];

export const fieldTypeDefinitions: FieldTypeDefinition[] = [
  // 文字輸入類
  {
    type: 'text',
    label: '單行文字',
    icon: 'ShortText',
    category: 'text',
    description: '單行文字輸入欄位',
  },
  {
    type: 'textarea',
    label: '多行文字',
    icon: 'Notes',
    category: 'text',
    description: '多行文字輸入欄位',
    defaultProperties: { rows: 4 },
  },
  {
    type: 'email',
    label: '電子郵件',
    icon: 'Email',
    category: 'text',
    description: '電子郵件輸入欄位',
  },
  {
    type: 'phone',
    label: '電話號碼',
    icon: 'Phone',
    category: 'text',
    description: '電話號碼輸入欄位',
  },
  {
    type: 'url',
    label: '網址',
    icon: 'Link',
    category: 'text',
    description: 'URL 網址輸入欄位',
  },
  {
    type: 'password',
    label: '密碼',
    icon: 'Password',
    category: 'text',
    description: '密碼輸入欄位',
  },
  {
    type: 'multipletext',
    label: '多重文字',
    icon: 'FormatListBulleted',
    category: 'text',
    description: '多個文字輸入欄位組合',
    defaultProperties: {
      items: [
        { name: 'item1', label: '項目 1' },
        { name: 'item2', label: '項目 2' },
      ],
    },
  },

  // 數值輸入類
  {
    type: 'number',
    label: '數字',
    icon: 'Numbers',
    category: 'number',
    description: '數字輸入欄位',
    defaultProperties: { min: null, max: null, step: 1 },
  },
  {
    type: 'slider',
    label: '滑桿',
    icon: 'LinearScale',
    category: 'number',
    description: '滑桿選擇數值',
    defaultProperties: { min: 0, max: 100, step: 1 },
  },
  {
    type: 'rating',
    label: '評分',
    icon: 'StarRate',
    category: 'number',
    description: '星級評分欄位',
    defaultProperties: { maxRating: 5, allowHalf: false },
  },

  // 選擇類
  {
    type: 'select',
    label: '下拉選單',
    icon: 'ArrowDropDownCircle',
    category: 'choice',
    description: '下拉選單單選',
    defaultProperties: {
      options: [
        { value: 'option1', label: '選項 1' },
        { value: 'option2', label: '選項 2' },
        { value: 'option3', label: '選項 3' },
      ],
    },
  },
  {
    type: 'multiselect',
    label: '多選下拉',
    icon: 'PlaylistAddCheck',
    category: 'choice',
    description: '下拉選單多選',
    defaultProperties: {
      options: [
        { value: 'option1', label: '選項 1' },
        { value: 'option2', label: '選項 2' },
        { value: 'option3', label: '選項 3' },
      ],
    },
  },
  {
    type: 'radio',
    label: '單選按鈕',
    icon: 'RadioButtonChecked',
    category: 'choice',
    description: '單選按鈕組',
    defaultProperties: {
      options: [
        { value: 'option1', label: '選項 1' },
        { value: 'option2', label: '選項 2' },
        { value: 'option3', label: '選項 3' },
      ],
      colCount: 1,
    },
  },
  {
    type: 'checkbox',
    label: '核取方塊',
    icon: 'CheckBox',
    category: 'choice',
    description: '核取方塊多選組',
    defaultProperties: {
      options: [
        { value: 'option1', label: '選項 1' },
        { value: 'option2', label: '選項 2' },
        { value: 'option3', label: '選項 3' },
      ],
      colCount: 1,
    },
  },
  {
    type: 'boolean',
    label: '是/否',
    icon: 'ToggleOn',
    category: 'choice',
    description: '布林開關欄位',
    defaultProperties: { displayStyle: 'switch' },
  },
  {
    type: 'imagepicker',
    label: '圖片選擇',
    icon: 'PhotoLibrary',
    category: 'choice',
    description: '圖片選擇器',
    defaultProperties: {
      choices: [
        { value: 'img1', label: '圖片 1', imageUrl: 'https://via.placeholder.com/100' },
        { value: 'img2', label: '圖片 2', imageUrl: 'https://via.placeholder.com/100' },
      ],
      multiSelect: false,
      showLabel: true,
    },
  },
  {
    type: 'ranking',
    label: '排序',
    icon: 'DragIndicator',
    category: 'choice',
    description: '拖拉排序欄位',
    defaultProperties: {
      choices: [
        { value: 'item1', label: '項目 1' },
        { value: 'item2', label: '項目 2' },
        { value: 'item3', label: '項目 3' },
      ],
    },
  },

  {
    type: 'cascadingselect',
    label: '階層選單',
    icon: 'AccountTree',
    category: 'choice',
    description: '多層級聯動下拉選單（如縣市→鄉鎮）',
    defaultProperties: {
      levels: [{ label: '第1層' }, { label: '第2層' }],
      options: [],
    },
  },

  // 日期時間類
  {
    type: 'date',
    label: '日期',
    icon: 'CalendarToday',
    category: 'datetime',
    description: '日期選擇器',
  },
  {
    type: 'time',
    label: '時間',
    icon: 'Schedule',
    category: 'datetime',
    description: '時間選擇器',
  },
  {
    type: 'datetime',
    label: '日期時間',
    icon: 'CalendarMonth',
    category: 'datetime',
    description: '日期與時間選擇器',
  },

  // 檔案與媒體類
  {
    type: 'file',
    label: '檔案上傳',
    icon: 'UploadFile',
    category: 'file',
    description: '檔案上傳欄位',
    defaultProperties: { maxFiles: 1, multiple: false },
  },
  {
    type: 'image',
    label: '圖片上傳',
    icon: 'AddPhotoAlternate',
    category: 'file',
    description: '圖片上傳欄位',
    defaultProperties: {
      accept: ['image/jpeg', 'image/png', 'image/gif'],
      maxFiles: 1,
    },
  },
  {
    type: 'signature',
    label: '簽名',
    icon: 'Draw',
    category: 'file',
    description: '手寫簽名欄位',
    defaultProperties: { width: 400, height: 150 },
  },

  // 矩陣表格類
  {
    type: 'matrix',
    label: '矩陣單選',
    icon: 'GridOn',
    category: 'matrix',
    description: '矩陣表格單選',
    defaultProperties: {
      rows: [
        { id: 'row1', label: '項目 1' },
        { id: 'row2', label: '項目 2' },
      ],
      columns: [
        { id: 'col1', label: '差' },
        { id: 'col2', label: '普通' },
        { id: 'col3', label: '好' },
      ],
    },
  },
  {
    type: 'matrixdropdown',
    label: '矩陣下拉',
    icon: 'TableChart',
    category: 'matrix',
    description: '矩陣表格含下拉選單',
    defaultProperties: {
      rows: [
        { id: 'row1', label: '項目 1' },
        { id: 'row2', label: '項目 2' },
      ],
      columns: [
        {
          name: 'rating',
          label: '評分',
          cellType: 'select',
          options: [
            { value: 'good', label: '好' },
            { value: 'fair', label: '普通' },
            { value: 'poor', label: '差' },
          ],
        },
      ],
    },
  },
  {
    type: 'matrixdynamic',
    label: '動態矩陣',
    icon: 'TableRows',
    category: 'matrix',
    description: '可新增刪除行的矩陣',
    defaultProperties: {
      columns: [
        { name: 'name', label: '名稱', cellType: 'text' },
        { name: 'value', label: '數值', cellType: 'number' },
      ],
      minRowCount: 1,
      maxRowCount: 10,
    },
  },

  // 版面配置類
  {
    type: 'panel',
    label: '面板',
    icon: 'Layers',
    category: 'layout',
    description: '可折疊的欄位群組',
    defaultProperties: {
      title: '面板標題',
      collapsible: true,
      collapsed: false,
      fields: [],
    },
  },
  {
    type: 'section',
    label: '區段標題',
    icon: 'ViewHeadline',
    category: 'layout',
    description: '區段分隔標題',
  },
  {
    type: 'html',
    label: 'HTML 內容',
    icon: 'Code',
    category: 'layout',
    description: '自訂 HTML 內容',
    defaultProperties: { content: '<p>在此輸入 HTML 內容</p>' },
  },
  {
    type: 'welcome',
    label: '歡迎區塊',
    icon: 'Celebration',
    category: 'layout',
    description: '表單開頭的歡迎說明區塊',
    defaultProperties: {
      title: '歡迎填寫本問卷',
      subtitle: '',
      alignment: 'center',
    },
  },
  {
    type: 'ending',
    label: '結束區塊',
    icon: 'CheckCircleOutline',
    category: 'layout',
    description: '表單結尾的結語區塊',
    defaultProperties: {
      title: '感謝您的填寫',
      message: '您的回覆已記錄。',
      alignment: 'center',
    },
  },
  {
    type: 'paneldynamic',
    label: '動態面板',
    icon: 'ViewStream',
    category: 'layout',
    description: '可新增刪除的面板組',
    defaultProperties: {
      minItems: 0,
      maxItems: 10,
      addButtonText: '新增',
      removeButtonText: '刪除',
      fields: [],
    },
  },

  // 特殊欄位類
  {
    type: 'hidden',
    label: '隱藏欄位',
    icon: 'VisibilityOff',
    category: 'special',
    description: '隱藏的資料欄位',
  },
  {
    type: 'expression',
    label: '計算欄位',
    icon: 'Calculate',
    category: 'special',
    description: '自動計算顯示結果',
    defaultProperties: {
      formula: '',
      displayFormat: 'number',
    },
  },
  {
    type: 'downloadreport',
    label: '下載報告',
    icon: 'PictureAsPdf',
    category: 'special',
    description: '產生 PDF 報告供下載',
    defaultProperties: {
      coverTitle: '報告',
      showDate: true,
      dateLabel: '日期',
      buttonText: '下載報告',
      excludeFieldTypes: ['welcome', 'ending', 'downloadreport', 'hidden', 'html'],
      showLogo: true,
    },
  },
];

// Get field type definition by type
export const getFieldTypeDefinition = (type: FieldType): FieldTypeDefinition | undefined => {
  return fieldTypeDefinitions.find((def) => def.type === type);
};

// Get field types by category
export const getFieldTypesByCategory = (category: FieldCategory): FieldTypeDefinition[] => {
  return fieldTypeDefinitions.filter((def) => def.category === category);
};

// Create default field from type
export const createDefaultField = (type: FieldType): { type: FieldType; label: string; properties?: Record<string, unknown> } => {
  const definition = getFieldTypeDefinition(type);

  if (!definition) {
    return { type, label: '未知欄位' };
  }

  return {
    type,
    label: definition.label,
    properties: definition.defaultProperties,
  };
};
