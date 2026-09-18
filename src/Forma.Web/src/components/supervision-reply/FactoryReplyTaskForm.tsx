import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  Button,
  Chip,
  Stack,
  Alert,
  Divider,
  Snackbar,
} from '@mui/material';
import { SupervisionFindingSummary } from './SupervisionFindingSummary';
import { RequiredMark } from './RequiredMark';
import type { FactoryReplyTaskDto, UpsertFactoryReplyRequest } from '@/types/api/supervisionReply';

interface FactoryReplyTaskFormProps {
  task: FactoryReplyTaskDto;
  onSave: (data: UpsertFactoryReplyRequest) => Promise<void>;
}

interface ItemFormState {
  replyText: string;
  isImprovementCompleted: string; // '' | 'true' | 'false'
  improvementStatus: string; // '' | 'InProgress' | 'NotStarted'
  completionDate: string;
  remarks: string;
}

export function FactoryReplyTaskForm({ task, onSave }: FactoryReplyTaskFormProps) {
  const items = task.reply?.items ?? [];

  const [itemStates, setItemStates] = useState<Record<string, ItemFormState>>(
    Object.fromEntries(
      items.map((i) => [
        i.id,
        {
          replyText: i.replyText ?? '',
          isImprovementCompleted: i.isImprovementCompleted == null ? '' : i.isImprovementCompleted ? 'true' : 'false',
          improvementStatus: i.improvementStatus ?? '',
          completionDate: i.completionDate?.slice(0, 10) ?? '',
          remarks: i.remarks ?? '',
        },
      ]),
    ),
  );
  const [fillerUnitName, setFillerUnitName] = useState(task.reply?.fillerUnitName ?? '');
  const [fillerName, setFillerName] = useState(task.reply?.fillerName ?? '');
  const [fillerContact, setFillerContact] = useState(task.reply?.fillerContact ?? '');

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(task.reply?.submittedAt ?? null);
  const [error, setError] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  const updateItem = (itemId: string, patch: Partial<ItemFormState>) => {
    setItemStates((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  };

  const handleSave = async () => {
    setError(null);

    const missing: string[] = [];
    for (const item of items) {
      const state = itemStates[item.id];
      if (!state?.replyText.trim()) missing.push(`「${item.description}」尚未填寫改善對策`);
      if (state?.isImprovementCompleted === '') missing.push(`「${item.description}」是否完成改善/辦理`);
      if (state?.isImprovementCompleted === 'false' && !state?.improvementStatus) missing.push(`「${item.description}」改善辦理狀態`);
      if (!state?.completionDate) missing.push(`「${item.description}」完成/預計完成日期`);
    }

    if (!fillerUnitName.trim()) missing.push('填表人單位');
    if (!fillerName.trim()) missing.push('填表人姓名');
    if (!fillerContact.trim()) missing.push('填表人聯絡方式');

    if (missing.length > 0) {
      setError(`請完整填寫以下必填欄位後再送出：${missing.join('、')}`);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        items: items.map((i) => {
          const state = itemStates[i.id];
          return {
            itemId: i.id,
            replyText: state.replyText.trim(),
            isImprovementCompleted: state.isImprovementCompleted === 'true',
            improvementStatus: state.isImprovementCompleted === 'false'
              ? (state.improvementStatus as 'InProgress' | 'NotStarted')
              : undefined,
            completionDate: state.completionDate,
            remarks: state.remarks || undefined,
          };
        }),
        fillerUnitName: fillerUnitName.trim(),
        fillerName: fillerName.trim(),
        fillerContact: fillerContact.trim(),
      });
      setSavedAt(new Date().toISOString());
      setToastOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗，請確認欄位是否填寫完整');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {task.agencyName} — {task.formTypeName}
          </Typography>
          {task.completedAt && (
            <Typography variant="caption" color="text.secondary">
              督導完成日期：{new Date(task.completedAt).toLocaleDateString()}
            </Typography>
          )}
        </Box>
        {savedAt && <Chip label="已送出" color="success" size="small" />}
      </Stack>

      <SupervisionFindingSummary findings={task.findings} />

      <Stack spacing={2}>
        {items.length === 0 ? (
          <Alert severity="info">管理人員尚未設定改善項目，請聯絡管理人員</Alert>
        ) : (
          <Stack spacing={2}>
            {items.map((item, idx) => {
              const state = itemStates[item.id];
              return (
                <Paper key={item.id} variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                    第 {idx + 1} 點：{item.description}
                  </Typography>

                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        改善對策/辦理情形<RequiredMark />
                      </Typography>
                      <TextField
                        multiline
                        minRows={2}
                        fullWidth
                        size="small"
                        placeholder="請針對這一點說明改善對策/辦理情形"
                        value={state?.replyText ?? ''}
                        onChange={(e) => updateItem(item.id, { replyText: e.target.value })}
                      />
                    </Box>

                    <Box>
                      <FormLabel sx={{ fontSize: '0.75rem' }}>是否完成改善/辦理<RequiredMark /></FormLabel>
                      <RadioGroup
                        row
                        value={state?.isImprovementCompleted ?? ''}
                        onChange={(e) =>
                          updateItem(item.id, {
                            isImprovementCompleted: e.target.value,
                            ...(e.target.value === 'true' ? { improvementStatus: '' } : {}),
                          })
                        }
                      >
                        <FormControlLabel value="true" control={<Radio size="small" />} label="是" />
                        <FormControlLabel value="false" control={<Radio size="small" />} label="否" />
                      </RadioGroup>
                    </Box>

                    {state?.isImprovementCompleted === 'false' && (
                      <Box>
                        <FormLabel sx={{ fontSize: '0.75rem' }}>改善辦理狀態<RequiredMark /></FormLabel>
                        <RadioGroup
                          row
                          value={state?.improvementStatus ?? ''}
                          onChange={(e) => updateItem(item.id, { improvementStatus: e.target.value })}
                        >
                          <FormControlLabel value="InProgress" control={<Radio size="small" />} label="改善辦理中" />
                          <FormControlLabel value="NotStarted" control={<Radio size="small" />} label="尚未改善" />
                        </RadioGroup>
                      </Box>
                    )}

                    <TextField
                      label={<>完成/預計完成日期<RequiredMark /></>}
                      type="date"
                      size="small"
                      value={state?.completionDate ?? ''}
                      onChange={(e) => updateItem(item.id, { completionDate: e.target.value })}
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={{ maxWidth: 240 }}
                    />

                    <TextField
                      label="備註"
                      multiline
                      minRows={2}
                      fullWidth
                      size="small"
                      value={state?.remarks ?? ''}
                      onChange={(e) => updateItem(item.id, { remarks: e.target.value })}
                    />
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}

        {items.length > 0 && <Divider />}

        <Typography variant="subtitle2">填表人資訊</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label={<>填表人單位<RequiredMark /></>}
            value={fillerUnitName}
            onChange={(e) => setFillerUnitName(e.target.value)}
            fullWidth
          />
          <TextField
            label={<>填表人姓名<RequiredMark /></>}
            value={fillerName}
            onChange={(e) => setFillerName(e.target.value)}
            fullWidth
          />
          <TextField
            label={<>聯絡方式<RequiredMark /></>}
            value={fillerContact}
            onChange={(e) => setFillerContact(e.target.value)}
            fullWidth
          />
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Box>
          <Button variant="contained" onClick={handleSave} disabled={saving || items.length === 0}>
            {saving ? '送出中…' : '送出/更新回覆'}
          </Button>
        </Box>
      </Stack>

      <Snackbar
        open={toastOpen}
        autoHideDuration={2500}
        onClose={() => setToastOpen(false)}
        message="已更新"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
}

export default FactoryReplyTaskForm;
