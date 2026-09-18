/**
 * ReportTestPage - PDF 報告測試頁面
 * 僅系統管理員可存取（permissions 包含 ManageSettings）
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { MainLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/authStore';
import { Navigate } from 'react-router';

const SAMPLE_SCHEMA = JSON.stringify(
  {
    version: '1',
    id: 'test',
    metadata: { title: '測試表單' },
    settings: {},
    pages: [
      {
        id: 'page1',
        title: '基本資料',
        fields: [
          { id: 'f1', type: 'text', name: 'company', label: '公司名稱' },
          { id: 'f2', type: 'text', name: 'contact', label: '聯絡人' },
          { id: 'f3', type: 'select', name: 'level', label: '等級', properties: { options: [{ value: 'A', label: 'A 級' }, { value: 'B', label: 'B 級' }] } },
          { id: 'f4', type: 'boolean', name: 'agree', label: '是否同意', properties: { labelTrue: '同意', labelFalse: '不同意' } },
          { id: 'f5', type: 'rating', name: 'score', label: '評分' },
        ],
      },
    ],
  },
  null,
  2
);

const SAMPLE_VALUES = JSON.stringify(
  {
    company: '範例科技公司',
    contact: '王小明',
    level: 'A',
    agree: true,
    score: 4,
  },
  null,
  2
);

const SAMPLE_PROPERTIES = JSON.stringify(
  {
    coverTitle: '{{company}}輔導報告',
    showDate: true,
    dateLabel: '日期',
    buttonText: '下載報告',
    excludeFieldTypes: ['welcome', 'ending', 'downloadreport', 'hidden', 'html'],
    showLogo: false,
  },
  null,
  2
);

export function ReportTestPage() {
  const { user } = useAuthStore();
  const isAdmin = user ? (BigInt(user.permissions ?? 0) & 7n) === 7n : false;

  const [schemaJson, setSchemaJson] = useState(SAMPLE_SCHEMA);
  const [valuesJson, setValuesJson] = useState(SAMPLE_VALUES);
  const [propertiesJson, setPropertiesJson] = useState(SAMPLE_PROPERTIES);
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGenerate = async () => {
    setError('');
    try {
      const schema = JSON.parse(schemaJson);
      const values = JSON.parse(valuesJson);
      const properties = JSON.parse(propertiesJson);

      setGenerating(true);
      const { generateReport } = await import(
        '@/components/form-fields/report/generateReport'
      );
      await generateReport({
        schema,
        values,
        properties,
        logoUrl: logoUrl || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <MainLayout>
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          PDF 報告測試
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          在此貼上表單 Schema、填寫值 JSON 與報告屬性，測試 PDF 產生結果。
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            表單 Schema（FormSchema JSON）
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={8}
            maxRows={20}
            value={schemaJson}
            onChange={(e) => setSchemaJson(e.target.value)}
            sx={{ mb: 3, fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
          />

          <Typography variant="subtitle2" gutterBottom>
            填寫值（Record&lt;string, unknown&gt; JSON）
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={6}
            maxRows={16}
            value={valuesJson}
            onChange={(e) => setValuesJson(e.target.value)}
            sx={{ mb: 3, fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
          />

          <Typography variant="subtitle2" gutterBottom>
            報告屬性（DownloadReportFieldProperties JSON）
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={6}
            maxRows={12}
            value={propertiesJson}
            onChange={(e) => setPropertiesJson(e.target.value)}
            sx={{ mb: 3, fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
          />

          <Typography variant="subtitle2" gutterBottom>
            Logo URL（選填）
          </Typography>
          <TextField
            fullWidth
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            size="small"
            sx={{ mb: 3 }}
          />

          <Divider sx={{ my: 2 }} />

          <Button
            variant="contained"
            size="large"
            startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? '產生中...' : '產生 PDF'}
          </Button>
        </Paper>
      </Box>
    </MainLayout>
  );
}
