import { Box } from '@mui/material';

/** 紅色米字號，標示必填欄位 */
export function RequiredMark() {
  return (
    <Box component="span" sx={{ color: 'error.main', ml: 0.5 }} aria-label="必填">
      ＊
    </Box>
  );
}

export default RequiredMark;
