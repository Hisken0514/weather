/**
 * FormFieldsTest - 表單欄位組件測試頁面
 */

import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Box, Button, Paper, Typography, Divider, Grid } from '@mui/material';
import { FieldRenderer } from '@/components/form-fields';
import type { Field } from '@/types/form';

// 測試用的欄位定義
const testFields: Field[] = [
  // 文字輸入類
  {
    id: 'text-1',
    type: 'text',
    name: 'fullName',
    label: '姓名',
    placeholder: '請輸入您的姓名',
    required: true,
    description: '請填寫真實姓名',
  },
  {
    id: 'email-1',
    type: 'email',
    name: 'email',
    label: '電子郵件',
    placeholder: 'example@email.com',
    required: true,
  },
  {
    id: 'phone-1',
    type: 'phone',
    name: 'phone',
    label: '電話號碼',
    placeholder: '0912-345-678',
  },
  {
    id: 'textarea-1',
    type: 'textarea',
    name: 'description',
    label: '自我介紹',
    placeholder: '請簡短介紹自己...',
    properties: {
      rows: 4,
      maxLength: 500,
    },
  },
  {
    id: 'password-1',
    type: 'password',
    name: 'password',
    label: '密碼',
    placeholder: '請輸入密碼',
    required: true,
  },
  {
    id: 'url-1',
    type: 'url',
    name: 'website',
    label: '個人網站',
    placeholder: 'https://example.com',
  },

  // 數值輸入類
  {
    id: 'number-1',
    type: 'number',
    name: 'age',
    label: '年齡',
    required: true,
    properties: {
      min: 0,
      max: 150,
      unit: '歲',
    },
  },
  {
    id: 'slider-1',
    type: 'slider',
    name: 'satisfaction',
    label: '滿意度',
    defaultValue: 50,
    properties: {
      min: 0,
      max: 100,
      step: 10,
      unit: '%',
    },
  },

  // 選擇類
  {
    id: 'select-1',
    type: 'select',
    name: 'country',
    label: '國家',
    required: true,
    properties: {
      options: [
        { value: 'tw', label: '台灣' },
        { value: 'us', label: '美國' },
        { value: 'jp', label: '日本' },
        { value: 'kr', label: '韓國' },
      ],
    },
  },
  {
    id: 'multiselect-1',
    type: 'multiselect',
    name: 'languages',
    label: '使用語言',
    properties: {
      options: [
        { value: 'zh', label: '中文' },
        { value: 'en', label: '英文' },
        { value: 'jp', label: '日文' },
        { value: 'kr', label: '韓文' },
      ],
    },
  },
  {
    id: 'radio-1',
    type: 'radio',
    name: 'gender',
    label: '性別',
    required: true,
    properties: {
      options: [
        { value: 'male', label: '男' },
        { value: 'female', label: '女' },
        { value: 'other', label: '其他' },
      ],
      colCount: 3,
    },
  },
  {
    id: 'checkbox-1',
    type: 'checkbox',
    name: 'interests',
    label: '興趣',
    properties: {
      options: [
        { value: 'reading', label: '閱讀' },
        { value: 'sports', label: '運動' },
        { value: 'music', label: '音樂' },
        { value: 'travel', label: '旅遊' },
        { value: 'cooking', label: '烹飪' },
        { value: 'gaming', label: '遊戲' },
      ],
      colCount: 3,
    },
  },

  // 布林類
  {
    id: 'boolean-switch-1',
    type: 'boolean',
    name: 'newsletter',
    label: '訂閱電子報',
    description: '接收最新消息和優惠資訊',
    properties: {
      displayStyle: 'switch',
    },
  },
  {
    id: 'boolean-checkbox-1',
    type: 'boolean',
    name: 'terms',
    label: '我同意服務條款',
    required: true,
    properties: {
      displayStyle: 'checkbox',
    },
  },
  {
    id: 'boolean-radio-1',
    type: 'boolean',
    name: 'contactPreference',
    label: '是否接受電話聯繫',
    properties: {
      displayStyle: 'radio',
      labelTrue: '接受',
      labelFalse: '不接受',
    },
  },

  // 評分類
  {
    id: 'rating-1',
    type: 'rating',
    name: 'rating',
    label: '產品評分',
    properties: {
      maxRating: 5,
      allowHalf: true,
      labels: ['很差', '較差', '普通', '良好', '優秀'],
    },
  },

  // 日期時間類
  {
    id: 'date-1',
    type: 'date',
    name: 'birthdate',
    label: '出生日期',
    required: true,
  },
  {
    id: 'time-1',
    type: 'time',
    name: 'preferredTime',
    label: '偏好聯繫時間',
  },
  {
    id: 'datetime-1',
    type: 'datetime',
    name: 'appointmentTime',
    label: '預約時間',
  },

  // 多重文字輸入
  {
    id: 'multipletext-1',
    type: 'multipletext',
    name: 'contactInfo',
    label: '聯絡資訊',
    description: '請填寫多種聯絡方式',
    properties: {
      items: [
        { name: 'homePhone', label: '家用電話', placeholder: '02-1234-5678' },
        { name: 'mobilePhone', label: '手機', placeholder: '0912-345-678' },
        { name: 'workPhone', label: '公司電話', placeholder: '02-8765-4321' },
        { name: 'fax', label: '傳真', placeholder: '02-1111-2222' },
      ],
      colCount: 2,
    },
  },

  // 圖片選擇
  {
    id: 'imagepicker-1',
    type: 'imagepicker',
    name: 'favoriteColor',
    label: '選擇喜歡的顏色',
    description: '點擊圖片進行選擇',
    properties: {
      choices: [
        { value: 'red', label: '紅色', imageUrl: 'https://via.placeholder.com/150/ff0000/ffffff?text=紅' },
        { value: 'blue', label: '藍色', imageUrl: 'https://via.placeholder.com/150/0000ff/ffffff?text=藍' },
        { value: 'green', label: '綠色', imageUrl: 'https://via.placeholder.com/150/00ff00/000000?text=綠' },
        { value: 'yellow', label: '黃色', imageUrl: 'https://via.placeholder.com/150/ffff00/000000?text=黃' },
      ],
      multiSelect: false,
      showLabel: true,
      imageWidth: 120,
      imageHeight: 120,
    },
  },

  // 排序
  {
    id: 'ranking-1',
    type: 'ranking',
    name: 'priorities',
    label: '優先順序排列',
    description: '拖拉排列您的優先順序',
    properties: {
      choices: [
        { value: 'health', label: '健康' },
        { value: 'family', label: '家庭' },
        { value: 'career', label: '事業' },
        { value: 'wealth', label: '財富' },
        { value: 'happiness', label: '快樂' },
      ],
    },
  },

  // 檔案上傳
  {
    id: 'file-1',
    type: 'file',
    name: 'resume',
    label: '上傳履歷',
    description: '支援 PDF、DOC、DOCX 格式',
    properties: {
      accept: ['.pdf', '.doc', '.docx'],
      maxSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 1,
      multiple: false,
    },
  },
  {
    id: 'image-1',
    type: 'image',
    name: 'avatar',
    label: '上傳頭像',
    description: '支援 JPG、PNG、GIF 格式',
    properties: {
      accept: ['image/jpeg', 'image/png', 'image/gif'],
      maxSize: 2 * 1024 * 1024, // 2MB
      maxFiles: 1,
      multiple: false,
    },
  },

  // 簽名
  {
    id: 'signature-1',
    type: 'signature',
    name: 'signature',
    label: '簽名',
    description: '請在下方區域簽名',
    properties: {
      width: 400,
      height: 150,
      penColor: '#000000',
      backgroundColor: '#f5f5f5',
    },
  },

  // 矩陣（單選矩陣）
  {
    id: 'matrix-1',
    type: 'matrix',
    name: 'serviceRating',
    label: '服務評價',
    description: '請評價以下各項服務',
    properties: {
      rows: [
        { id: 'speed', label: '服務速度' },
        { id: 'quality', label: '服務品質' },
        { id: 'attitude', label: '服務態度' },
        { id: 'price', label: '價格合理性' },
      ],
      columns: [
        { id: '1', label: '很差' },
        { id: '2', label: '差' },
        { id: '3', label: '普通' },
        { id: '4', label: '好' },
        { id: '5', label: '很好' },
      ],
      alternateRows: true,
      showHeader: true,
    },
  },

  // 矩陣下拉
  {
    id: 'matrixdropdown-1',
    type: 'matrixdropdown',
    name: 'productFeedback',
    label: '產品回饋',
    description: '請針對各產品給予回饋',
    properties: {
      rows: [
        { id: 'productA', label: '產品 A' },
        { id: 'productB', label: '產品 B' },
        { id: 'productC', label: '產品 C' },
      ],
      columns: [
        {
          name: 'quality',
          label: '品質',
          cellType: 'select',
          options: [
            { value: 'excellent', label: '優秀' },
            { value: 'good', label: '良好' },
            { value: 'fair', label: '普通' },
            { value: 'poor', label: '差' },
          ],
        },
        {
          name: 'price',
          label: '價格',
          cellType: 'select',
          options: [
            { value: 'cheap', label: '便宜' },
            { value: 'fair', label: '合理' },
            { value: 'expensive', label: '昂貴' },
          ],
        },
        {
          name: 'comment',
          label: '備註',
          cellType: 'text',
        },
      ],
    },
  },

  // 動態矩陣
  {
    id: 'matrixdynamic-1',
    type: 'matrixdynamic',
    name: 'familyMembers',
    label: '家庭成員',
    description: '請填寫家庭成員資訊（可新增或刪除）',
    properties: {
      columns: [
        { name: 'name', label: '姓名', cellType: 'text' },
        { name: 'relation', label: '關係', cellType: 'text' },
        { name: 'age', label: '年齡', cellType: 'number' },
      ],
      minRowCount: 0,
      maxRowCount: 10,
      addRowText: '新增成員',
      removeRowText: '移除',
    },
  },

  // 面板
  {
    id: 'panel-1',
    type: 'panel',
    name: 'addressPanel',
    label: '地址資訊',
    properties: {
      title: '地址資訊',
      description: '請填寫您的地址',
      collapsible: true,
      collapsed: false,
      fields: [
        {
          id: 'panel-city',
          type: 'text',
          name: 'city',
          label: '城市',
          placeholder: '例：台北市',
        },
        {
          id: 'panel-district',
          type: 'text',
          name: 'district',
          label: '區域',
          placeholder: '例：信義區',
        },
        {
          id: 'panel-address',
          type: 'textarea',
          name: 'address',
          label: '詳細地址',
          placeholder: '街道、巷弄、樓層...',
          properties: {
            rows: 2,
          },
        },
        {
          id: 'panel-zipcode',
          type: 'text',
          name: 'zipcode',
          label: '郵遞區號',
          placeholder: '110',
        },
      ],
    },
  },

  // 動態面板
  {
    id: 'paneldynamic-1',
    type: 'paneldynamic',
    name: 'workExperience',
    label: '工作經歷',
    description: '請填寫您的工作經歷（可新增多筆）',
    properties: {
      minItems: 0,
      maxItems: 5,
      addButtonText: '新增工作經歷',
      removeButtonText: '刪除',
      itemLabel: '工作',
      fields: [
        {
          id: 'work-company',
          type: 'text',
          name: 'company',
          label: '公司名稱',
          required: true,
        },
        {
          id: 'work-position',
          type: 'text',
          name: 'position',
          label: '職位',
          required: true,
        },
        {
          id: 'work-duration',
          type: 'text',
          name: 'duration',
          label: '任職期間',
          placeholder: '例：2020/01 - 2023/12',
        },
        {
          id: 'work-description',
          type: 'textarea',
          name: 'description',
          label: '工作描述',
          properties: {
            rows: 3,
          },
        },
      ],
    },
  },

  // HTML 內容
  {
    id: 'html-1',
    type: 'html',
    name: 'instructions',
    label: '',
    properties: {
      content: `
        <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; border-left: 4px solid #1976d2;">
          <h4 style="margin: 0 0 8px 0; color: #1976d2;">填寫說明</h4>
          <p style="margin: 0; color: #333;">
            請確實填寫以下資訊，帶有 <span style="color: red;">*</span> 符號的欄位為必填項目。
            如有任何問題，請聯繫客服：<a href="mailto:support@example.com">support@example.com</a>
          </p>
        </div>
      `,
    },
  },

  // 計算欄位
  {
    id: 'expression-1',
    type: 'expression',
    name: 'totalScore',
    label: '總分',
    description: '根據年齡和滿意度自動計算',
    properties: {
      formula: '{age} + {satisfaction}',
      precision: 0,
      unit: '分',
      displayFormat: 'number',
    },
  },
];

// 驗證 schema
const validationSchema = yup.object().shape({
  fullName: yup.string().required('姓名為必填'),
  email: yup.string().email('請輸入有效的電子郵件').required('電子郵件為必填'),
  password: yup.string().min(6, '密碼至少 6 個字元').required('密碼為必填'),
  age: yup.number().min(0, '年齡不能為負數').max(150, '請輸入有效年齡').required('年齡為必填'),
  country: yup.string().required('請選擇國家'),
  gender: yup.string().required('請選擇性別'),
  birthdate: yup.string().required('請選擇出生日期'),
  terms: yup.boolean().oneOf([true], '請同意服務條款'),
});

export function FormFieldsTest() {
  const methods = useForm({
    resolver: yupResolver(validationSchema),
    mode: 'onChange',
  });

  const onSubmit = (data: Record<string, unknown>) => {
    console.log('表單資料:', data);
    alert('表單提交成功！請查看 Console 查看資料');
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        表單欄位組件測試
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        測試各種表單欄位組件的功能和驗證
      </Typography>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* HTML 說明 */}
            <Grid size={12}>
              {testFields
                .filter((f) => f.type === 'html')
                .map((field) => (
                  <FieldRenderer key={field.id} field={field} />
                ))}
            </Grid>

            {/* 文字輸入類 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  文字輸入類
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {testFields
                    .filter((f) => ['text', 'textarea', 'email', 'phone', 'url', 'password'].includes(f.type))
                    .map((field) => (
                      <Grid size={{ xs: 12, md: 6 }} key={field.id}>
                        <FieldRenderer field={field} />
                      </Grid>
                    ))}
                </Grid>
              </Paper>
            </Grid>

            {/* 多重文字輸入 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  多重文字輸入
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {testFields
                  .filter((f) => f.type === 'multipletext')
                  .map((field) => (
                    <FieldRenderer key={field.id} field={field} />
                  ))}
              </Paper>
            </Grid>

            {/* 數值輸入類 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  數值輸入類
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {testFields
                    .filter((f) => ['number', 'slider'].includes(f.type))
                    .map((field) => (
                      <Grid size={{ xs: 12, md: 6 }} key={field.id}>
                        <FieldRenderer field={field} />
                      </Grid>
                    ))}
                </Grid>
              </Paper>
            </Grid>

            {/* 計算欄位 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  計算欄位
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {testFields
                  .filter((f) => f.type === 'expression')
                  .map((field) => (
                    <FieldRenderer key={field.id} field={field} />
                  ))}
              </Paper>
            </Grid>

            {/* 選擇類 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  選擇類
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {testFields
                    .filter((f) => ['select', 'multiselect', 'radio', 'checkbox'].includes(f.type))
                    .map((field) => (
                      <Grid size={{ xs: 12, md: 6 }} key={field.id}>
                        <FieldRenderer field={field} />
                      </Grid>
                    ))}
                </Grid>
              </Paper>
            </Grid>

            {/* 圖片選擇 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  圖片選擇
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {testFields
                  .filter((f) => f.type === 'imagepicker')
                  .map((field) => (
                    <FieldRenderer key={field.id} field={field} />
                  ))}
              </Paper>
            </Grid>

            {/* 排序欄位 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  排序欄位（拖拉排序）
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {testFields
                  .filter((f) => f.type === 'ranking')
                  .map((field) => (
                    <FieldRenderer key={field.id} field={field} />
                  ))}
              </Paper>
            </Grid>

            {/* 布林類 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  布林類
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {testFields
                    .filter((f) => f.type === 'boolean')
                    .map((field) => (
                      <Grid size={{ xs: 12, md: 4 }} key={field.id}>
                        <FieldRenderer field={field} />
                      </Grid>
                    ))}
                </Grid>
              </Paper>
            </Grid>

            {/* 評分類 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  評分類
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {testFields
                    .filter((f) => f.type === 'rating')
                    .map((field) => (
                      <Grid size={{ xs: 12, md: 6 }} key={field.id}>
                        <FieldRenderer field={field} />
                      </Grid>
                    ))}
                </Grid>
              </Paper>
            </Grid>

            {/* 日期時間類 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  日期時間類
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {testFields
                    .filter((f) => ['date', 'time', 'datetime'].includes(f.type))
                    .map((field) => (
                      <Grid size={{ xs: 12, md: 4 }} key={field.id}>
                        <FieldRenderer field={field} />
                      </Grid>
                    ))}
                </Grid>
              </Paper>
            </Grid>

            {/* 檔案上傳類 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  檔案上傳類
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {testFields
                    .filter((f) => ['file', 'image'].includes(f.type))
                    .map((field) => (
                      <Grid size={{ xs: 12, md: 6 }} key={field.id}>
                        <FieldRenderer field={field} />
                      </Grid>
                    ))}
                </Grid>
              </Paper>
            </Grid>

            {/* 簽名欄位 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  簽名欄位
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {testFields
                  .filter((f) => f.type === 'signature')
                  .map((field) => (
                    <FieldRenderer key={field.id} field={field} />
                  ))}
              </Paper>
            </Grid>

            {/* 矩陣類 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  矩陣類（單選矩陣）
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {testFields
                  .filter((f) => f.type === 'matrix')
                  .map((field) => (
                    <FieldRenderer key={field.id} field={field} />
                  ))}
              </Paper>
            </Grid>

            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  矩陣下拉
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {testFields
                  .filter((f) => f.type === 'matrixdropdown')
                  .map((field) => (
                    <FieldRenderer key={field.id} field={field} />
                  ))}
              </Paper>
            </Grid>

            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  動態矩陣（可新增刪除行）
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {testFields
                  .filter((f) => f.type === 'matrixdynamic')
                  .map((field) => (
                    <FieldRenderer key={field.id} field={field} />
                  ))}
              </Paper>
            </Grid>

            {/* 面板類 */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  面板（可折疊）
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {testFields
                  .filter((f) => f.type === 'panel')
                  .map((field) => (
                    <FieldRenderer key={field.id} field={field} />
                  ))}
              </Paper>
            </Grid>

            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  動態面板（可新增刪除項目）
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {testFields
                  .filter((f) => f.type === 'paneldynamic')
                  .map((field) => (
                    <FieldRenderer key={field.id} field={field} />
                  ))}
              </Paper>
            </Grid>

            {/* 提交按鈕 */}
            <Grid size={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button type="submit" variant="contained" size="large">
                  提交表單
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  size="large"
                  onClick={() => methods.reset()}
                >
                  重置表單
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  size="large"
                  onClick={() => console.log('目前表單值:', methods.getValues())}
                >
                  查看目前值 (Console)
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </FormProvider>
    </Box>
  );
}

export default FormFieldsTest;
