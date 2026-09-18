/**
 * EmptyCanvasPlaceholder - Shown when canvas has no fields
 */

import { Box, Typography } from '@mui/material';
import { DragIndicator as DragIcon, Add as AddIcon } from '@mui/icons-material';

export function EmptyCanvasPlaceholder() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
        border: '2px dashed',
        borderColor: 'divider',
        borderRadius: 2,
        backgroundColor: 'grey.50',
        textAlign: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'primary.light',
          color: 'primary.contrastText',
        }}
      >
        <DragIcon sx={{ fontSize: 32 }} />
      </Box>

      <Box>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          開始建立您的表單
        </Typography>
        <Typography variant="body2" color="text.disabled">
          從左側工具箱拖曳欄位到這裡
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mt: 2,
          p: 2,
          borderRadius: 1,
          backgroundColor: 'background.paper',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <AddIcon color="primary" />
        <Typography variant="body2" color="text.secondary">
          或點擊左側的欄位類型快速新增
        </Typography>
      </Box>
    </Box>
  );
}
