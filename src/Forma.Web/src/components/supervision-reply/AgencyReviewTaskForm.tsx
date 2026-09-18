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
  Select,
  MenuItem,
  Button,
  Chip,
  Stack,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import { SupervisionFindingSummary } from './SupervisionFindingSummary';
import { RequiredMark } from './RequiredMark';
import type {
  AgencyReviewTaskDto,
  UpsertAgencyReviewRequest,
  ReinspectionResult,
} from '@/types/api/supervisionReply';

const RESULT_LABELS: Record<ReinspectionResult, string> = {
  Improved: '已改善',
  PendingImprovement: '待改善',
  Other: '其他',
};

interface AgencyReviewTaskFormProps {
  task: AgencyReviewTaskDto;
  onSave: (data: UpsertAgencyReviewRequest) => Promise<void>;
  /** 是否顯示標題（登入雙軌一次列出多機關資料時，建議顯示機關名稱） */
  showAgencyName?: boolean;
  /** 登入雙軌時填表人資訊改由後端帶入登入帳號資料，不需要手動填寫、也不用顯示這個區塊 */
  hideReviewerInfo?: boolean;
}

interface ItemFormState {
  willReinspect: string; // '' | 'true' | 'false'
  reinspectionDate: string;
  result: ReinspectionResult | '';
  resultOtherText: string;
  willPenalize: string; // '' | 'true' | 'false'
  violatedRegulation: string;
  penaltyAmount: string;
  agencyRemarks: string;
}

export function AgencyReviewTaskForm({ task, onSave, showAgencyName, hideReviewerInfo }: AgencyReviewTaskFormProps) {
  const items = task.items;

  const [itemStates, setItemStates] = useState<Record<string, ItemFormState>>(
    Object.fromEntries(
      items.map((i) => [
        i.id,
        {
          willReinspect: i.willReinspect == null ? '' : i.willReinspect ? 'true' : 'false',
          reinspectionDate: i.reinspectionDate?.slice(0, 10) ?? '',
          result: i.result ?? '',
          resultOtherText: i.resultOtherText ?? '',
          willPenalize: i.willPenalize == null ? '' : i.willPenalize ? 'true' : 'false',
          violatedRegulation: i.violatedRegulation ?? '',
          penaltyAmount: i.penaltyAmount?.toString() ?? '',
          agencyRemarks: i.agencyRemarks ?? '',
        },
      ]),
    ),
  );
  const [reviewerAgencyName, setReviewerAgencyName] = useState(task.reviewerAgencyName ?? '');
  const [reviewerName, setReviewerName] = useState(task.reviewerName ?? '');
  const [reviewerContact, setReviewerContact] = useState(task.reviewerContact ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(task.submittedAt);
  const [toastOpen, setToastOpen] = useState(false);

  const updateItem = (itemId: string, patch: Partial<ItemFormState>) => {
    setItemStates((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  };

  const handleSave = async () => {
    setError(null);

    const missing: string[] = [];
    for (const item of items) {
      const state = itemStates[item.id];
      const reinspectYes = state?.willReinspect === 'true';
      const penalizeYes = state?.willPenalize === 'true';

      if (state?.willReinspect === '') missing.push(`「${item.description}」【1】是否複查`);
      if (reinspectYes) {
        if (!state.reinspectionDate) missing.push(`「${item.description}」【2】(預計)複查日期`);
        if (!state.result) missing.push(`「${item.description}」【3】複查結果`);
        if (state.result === 'Other' && !state.resultOtherText.trim()) {
          missing.push(`「${item.description}」複查結果「其他」的說明`);
        }
      }
      if (state?.willPenalize === '') missing.push(`「${item.description}」【4】是否裁處`);
      if (penalizeYes) {
        if (!state.violatedRegulation.trim()) missing.push(`「${item.description}」【5】違反法條`);
        if (!state.penaltyAmount || Number(state.penaltyAmount) <= 0) missing.push(`「${item.description}」【6】裁處金額`);
      }
    }
    if (!hideReviewerInfo) {
      if (!reviewerAgencyName.trim()) missing.push('機關單位');
      if (!reviewerName.trim()) missing.push('姓名');
      if (!reviewerContact.trim()) missing.push('聯絡方式');
    }

    if (missing.length > 0) {
      setError(`請完整填寫以下必填欄位後再送出：${missing.join('、')}`);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        items: items.map((i) => {
          const state = itemStates[i.id];
          const reinspectYes = state.willReinspect === 'true';
          const penalizeYes = state.willPenalize === 'true';
          return {
            itemId: i.id,
            willReinspect: reinspectYes,
            reinspectionDate: reinspectYes ? state.reinspectionDate || undefined : undefined,
            result: reinspectYes ? (state.result || undefined) : undefined,
            resultOtherText: reinspectYes && state.result === 'Other' ? state.resultOtherText || undefined : undefined,
            willPenalize: penalizeYes,
            violatedRegulation: penalizeYes ? state.violatedRegulation || undefined : undefined,
            penaltyAmount: penalizeYes && state.penaltyAmount ? Number(state.penaltyAmount) : undefined,
            agencyRemarks: state.agencyRemarks || undefined,
          };
        }),
        reviewerAgencyName: hideReviewerInfo ? undefined : (reviewerAgencyName || undefined),
        reviewerName: hideReviewerInfo ? undefined : (reviewerName || undefined),
        reviewerContact: hideReviewerInfo ? undefined : (reviewerContact || undefined),
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {task.factoryName}
            {task.factoryRegistrationNo && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                （登記編號：{task.factoryRegistrationNo}）
              </Typography>
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {showAgencyName ? `${task.agencyName} — ` : ''}
            {task.formTypeName}
            {task.completedAt && ` ｜ 督導完成日期：${new Date(task.completedAt).toLocaleDateString()}`}
          </Typography>
        </Box>
        {savedAt && <Chip label="已送出" color="success" size="small" />}
      </Stack>

      <SupervisionFindingSummary findings={task.findings} />

      {!task.factoryReplySubmittedAt && (
        <Alert severity="warning" sx={{ mb: 2 }}>工廠尚未送出改善回覆，以下內容可能尚未填寫完整</Alert>
      )}

      {task.needsReReview && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          工廠已於 {new Date(task.factoryReplySubmittedAt!).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          {' '}更新過回覆內容，晚於您上次複查的送出時間，請重新確認以下內容是否仍然正確
        </Alert>
      )}

      <Stack spacing={2}>
        {items.length === 0 ? (
          <Alert severity="info">管理人員尚未設定改善項目，請聯絡管理人員</Alert>
        ) : (
          <Stack spacing={2}>
            {items.map((item, idx) => {
              const state = itemStates[item.id];
              const reinspectYes = state?.willReinspect === 'true';
              const penalizeYes = state?.willPenalize === 'true';
              return (
                <Paper key={item.id} variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                    第 {idx + 1} 點：{item.description}
                  </Typography>

                  {/* 工廠改善回覆（唯讀） */}
                  <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'grey.300', borderRadius: 1, p: 1.5, mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                      工廠回覆
                    </Typography>
                    <Typography variant="body2">改善對策/辦理情形：{item.factoryReplyText || '（未填寫）'}</Typography>
                    <Typography variant="body2">
                      是否完成改善：
                      {item.factoryIsImprovementCompleted == null ? '（未填寫）' : item.factoryIsImprovementCompleted ? '是' : '否'}
                    </Typography>
                    {item.factoryIsImprovementCompleted === false && (
                      <Typography variant="body2">
                        改善辦理狀態：
                        {item.factoryImprovementStatus === 'InProgress' ? '改善辦理中' : item.factoryImprovementStatus === 'NotStarted' ? '尚未改善' : '（未填寫）'}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      完成/預計完成日期：
                      {item.factoryCompletionDate ? new Date(item.factoryCompletionDate).toLocaleDateString() : '（未填寫）'}
                    </Typography>
                    {item.factoryRemarks && <Typography variant="body2">備註：{item.factoryRemarks}</Typography>}
                  </Box>

                  <Stack spacing={1.5}>
                    <Box>
                      <FormLabel sx={{ fontSize: '0.75rem' }}>
                        【1】是否複查(如"是" 請續填2、3)<RequiredMark />
                      </FormLabel>
                      <RadioGroup
                        row
                        value={state?.willReinspect ?? ''}
                        onChange={(e) => updateItem(item.id, { willReinspect: e.target.value })}
                      >
                        <FormControlLabel value="true" control={<Radio size="small" />} label="是" />
                        <FormControlLabel value="false" control={<Radio size="small" />} label="否" />
                      </RadioGroup>
                    </Box>

                    {reinspectYes && (
                      <>
                        <TextField
                          label="【2】(預計)複查日期"
                          type="date"
                          size="small"
                          value={state.reinspectionDate}
                          onChange={(e) => updateItem(item.id, { reinspectionDate: e.target.value })}
                          slotProps={{ inputLabel: { shrink: true } }}
                          sx={{ maxWidth: 240 }}
                          required
                        />

                        <Box>
                          <FormLabel sx={{ fontSize: '0.75rem' }}>【3】複查結果</FormLabel>
                          <Select
                            value={state.result}
                            onChange={(e) => updateItem(item.id, { result: e.target.value as ReinspectionResult })}
                            displayEmpty
                            size="small"
                            sx={{ display: 'block', mt: 0.5, minWidth: 200 }}
                          >
                            <MenuItem value="" disabled>
                              請選擇
                            </MenuItem>
                            {(Object.keys(RESULT_LABELS) as ReinspectionResult[]).map((key) => (
                              <MenuItem key={key} value={key}>
                                {RESULT_LABELS[key]}
                              </MenuItem>
                            ))}
                          </Select>
                        </Box>

                        {state.result === 'Other' && (
                          <TextField
                            label="其他（請說明）"
                            fullWidth
                            size="small"
                            value={state.resultOtherText}
                            onChange={(e) => updateItem(item.id, { resultOtherText: e.target.value })}
                          />
                        )}
                      </>
                    )}

                    <Box>
                      <FormLabel sx={{ fontSize: '0.75rem' }}>
                        【4】是否裁處(如"是"請續填5、6)<RequiredMark />
                      </FormLabel>
                      <RadioGroup
                        row
                        value={state?.willPenalize ?? ''}
                        onChange={(e) => updateItem(item.id, { willPenalize: e.target.value })}
                      >
                        <FormControlLabel value="true" control={<Radio size="small" />} label="是" />
                        <FormControlLabel value="false" control={<Radio size="small" />} label="否" />
                      </RadioGroup>
                    </Box>

                    {penalizeYes && (
                      <>
                        <TextField
                          label="【5】違反法條"
                          fullWidth
                          size="small"
                          value={state.violatedRegulation}
                          onChange={(e) => updateItem(item.id, { violatedRegulation: e.target.value })}
                          required
                        />
                        <TextField
                          label="【6】裁處金額"
                          type="number"
                          size="small"
                          value={state.penaltyAmount}
                          onChange={(e) => updateItem(item.id, { penaltyAmount: e.target.value })}
                          placeholder="範例：5000"
                          sx={{ maxWidth: 240 }}
                          required
                        />
                      </>
                    )}

                    <TextField
                      label="備註"
                      multiline
                      minRows={2}
                      fullWidth
                      size="small"
                      value={state?.agencyRemarks ?? ''}
                      onChange={(e) => updateItem(item.id, { agencyRemarks: e.target.value })}
                    />
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}

        {items.length > 0 && <Divider />}

        {!hideReviewerInfo && (
          <>
            <Typography variant="subtitle2">填表人資訊</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={<>機關單位<RequiredMark /></>}
                value={reviewerAgencyName}
                onChange={(e) => setReviewerAgencyName(e.target.value)}
                fullWidth
              />
              <TextField
                label={<>姓名<RequiredMark /></>}
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                fullWidth
              />
              <TextField
                label={<>聯絡方式<RequiredMark /></>}
                value={reviewerContact}
                onChange={(e) => setReviewerContact(e.target.value)}
                fullWidth
              />
            </Stack>
          </>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Box>
          <Button variant="contained" onClick={handleSave} disabled={saving || items.length === 0}>
            {saving ? '送出中…' : '送出/更新複查登打'}
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

export default AgencyReviewTaskForm;
