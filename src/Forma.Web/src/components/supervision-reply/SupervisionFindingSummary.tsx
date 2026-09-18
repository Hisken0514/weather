import { Box, Typography, Stack } from '@mui/material';
import type { SupervisionFindingDto } from '@/types/api/supervisionReply';

interface SupervisionFindingSummaryProps {
  findings: SupervisionFindingDto[];
}

/**
 * 唯讀顯示督導當初的督導結果/違反法規條款/違反事實/建議事項備註，讓工廠/機關知道要回覆/複查什麼。
 * 這幾個欄位常常是編號多點的條列文字（1. ... 2. ...），用 pre-line 保留換行才能正確顯示。
 */
export function SupervisionFindingSummary({ findings }: SupervisionFindingSummaryProps) {
  if (findings.length === 0) return null;

  return (
    <Box sx={{ bgcolor: 'grey.100', borderLeft: 3, borderColor: 'primary.main', borderRadius: 1, p: 2, mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        督導結果
      </Typography>
      <Stack spacing={1}>
        {findings.map((f) => (
          <Box key={f.label}>
            <Typography variant="body2" fontWeight={600} component="span">
              {f.label}：
            </Typography>
            <Typography variant="body2" component="span" sx={{ whiteSpace: 'pre-line' }}>
              {f.value || '（無）'}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default SupervisionFindingSummary;
