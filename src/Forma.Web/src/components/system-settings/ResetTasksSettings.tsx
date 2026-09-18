import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Chip,
  Paper,
} from '@mui/material';
import { RestartAlt as ResetIcon, Search as SearchIcon } from '@mui/icons-material';
import { supervisionApi } from '@/lib/api/supervision';
import { formsApi } from '@/lib/api/forms';
import type { CampaignDto } from '@/types/api/supervision';
import type { TaskResetPreviewItem } from '@/types/api/supervision';
import type { FormListDto } from '@/types/api';

const STATUS_LABEL: Record<string, { label: string; color: 'default' | 'warning' | 'success' }> = {
  Pending:    { label: '待填寫', color: 'default' },
  InProgress: { label: '填寫中', color: 'warning' },
  Completed:  { label: '已完成', color: 'success' },
};

export function ResetTasksSettings() {
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [forms, setForms] = useState<FormListDto[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [resetMode, setResetMode] = useState<'campaign' | 'form' | 'selective'>('campaign');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [factorySearch, setFactorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('InProgress');

  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingForms, setLoadingForms] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<TaskResetPreviewItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supervisionApi.getCampaigns()
      .then(res => setCampaigns(res))
      .catch(() => setError('無法載入督導計畫'))
      .finally(() => setLoadingCampaigns(false));
  }, []);

  useEffect(() => {
    setSelectedFormId('');
    setForms([]);
    setPreview(null);
    if (!selectedCampaignId) return;

    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (!campaign?.formProjectId) return;

    setLoadingForms(true);
    formsApi.getProjectForms(campaign.formProjectId, { pageSize: 100 })
      .then(res => setForms(res.items))
      .catch(() => setForms([]))
      .finally(() => setLoadingForms(false));
  }, [selectedCampaignId, campaigns]);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  const handlePreview = async () => {
    if (!selectedCampaignId) return;
    setPreviewing(true);
    setPreview(null);
    setError('');
    try {
      const items = await supervisionApi.getResetTasksPreview({
        campaignId: selectedCampaignId,
        formId: selectedFormId || undefined,
        factorySearch: factorySearch.trim() || undefined,
        status: statusFilter || undefined,
      });
      setPreview(items);
      setSelected(new Set(items.map(i => i.taskId)));
    } catch {
      setError('查詢失敗，請稍後再試');
    } finally {
      setPreviewing(false);
    }
  };

  const toggleAll = () => {
    if (!preview) return;
    setSelected(selected.size === preview.length ? new Set() : new Set(preview.map(i => i.taskId)));
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const canReset =
    selectedCampaignId !== '' &&
    (resetMode !== 'form' || selectedFormId !== '') &&
    (resetMode !== 'selective' || (preview !== null && selected.size > 0));

  const handleReset = async () => {
    setConfirmOpen(false);
    setResetting(true);
    setResult(null);
    setError('');
    try {
      let res: { resetCount: number };
      if (resetMode === 'selective') {
        res = await supervisionApi.resetTasks({ taskIds: Array.from(selected) });
      } else {
        const params = resetMode === 'campaign'
          ? { campaignId: selectedCampaignId }
          : { campaignId: selectedCampaignId, formId: selectedFormId };
        res = await supervisionApi.resetTasks(params);
      }
      setResult({ count: res.resetCount });
      setPreview(null);
      setSelected(new Set());
    } catch {
      setError('重置失敗，請稍後再試');
    } finally {
      setResetting(false);
    }
  };

  const confirmMessage = (() => {
    if (resetMode === 'selective')
      return `確定要將所選的 ${selected.size} 筆督導任務重置為待填寫狀態嗎？`;
    if (resetMode === 'campaign')
      return `確定要將「${selectedCampaign?.name}」底下所有督導任務重置為未填寫的初始狀態嗎？`;
    return `確定要將表單「${forms.find(f => f.id === selectedFormId)?.name}」的所有督導任務重置為未填寫的初始狀態嗎？`;
  })();

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        任務初始化重置
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        將指定計畫或表單的督導任務重置為初始未填寫狀態（清除已連結的表單提交紀錄）。
        此操作不可復原，請謹慎使用。
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        重置後，任務狀態將回到「待填寫」，原本填寫的資料連結將被移除。
        已儲存的表單提交紀錄不會被刪除，但不再與任務關聯。
      </Alert>

      {/* Step 1: 選計畫 */}
      <Typography variant="subtitle2" fontWeight="bold" mb={1}>
        第一步：選擇督導計畫
      </Typography>
      {loadingCampaigns ? (
        <CircularProgress size={24} />
      ) : (
        <FormControl fullWidth size="small" sx={{ mb: 3, maxWidth: 400 }}>
          <InputLabel>督導計畫</InputLabel>
          <Select
            value={selectedCampaignId}
            label="督導計畫"
            onChange={e => {
              setSelectedCampaignId(e.target.value);
              setResetMode('campaign');
              setPreview(null);
              setResult(null);
            }}
          >
            {campaigns.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}（{c.year} 年，共 {c.taskCount} 筆任務）
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Step 2: 重置範圍 */}
      {selectedCampaignId && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>
            第二步：選擇重置範圍
          </Typography>
          <RadioGroup
            value={resetMode}
            onChange={e => {
              setResetMode(e.target.value as 'campaign' | 'form' | 'selective');
              setSelectedFormId('');
              setPreview(null);
              setResult(null);
            }}
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="campaign"
              control={<Radio size="small" />}
              label={`整個計畫（${selectedCampaign?.taskCount ?? 0} 筆任務全部重置）`}
            />
            <FormControlLabel
              value="form"
              control={<Radio size="small" />}
              label="計畫中的特定表單"
            />
            <FormControlLabel
              value="selective"
              control={<Radio size="small" />}
              label="精準選取任務（依業者/狀態查詢後勾選）"
            />
          </RadioGroup>

          {resetMode === 'form' && (
            <Box sx={{ pl: 4, mb: 2 }}>
              {loadingForms ? (
                <CircularProgress size={20} />
              ) : forms.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  此計畫尚未綁定任何表單
                </Typography>
              ) : (
                <FormControl fullWidth size="small" sx={{ maxWidth: 400 }}>
                  <InputLabel>表單</InputLabel>
                  <Select
                    value={selectedFormId}
                    label="表單"
                    onChange={e => { setSelectedFormId(e.target.value); setResult(null); }}
                  >
                    {forms.map(f => (
                      <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          )}

          {/* 精準選取模式 */}
          {resetMode === 'selective' && (
            <Box sx={{ pl: 0, mb: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                第三步：設定篩選條件並查詢
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'flex-end' }}>
                {forms.length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>表單（可不選）</InputLabel>
                    <Select
                      value={selectedFormId}
                      label="表單（可不選）"
                      onChange={e => setSelectedFormId(e.target.value)}
                    >
                      <MenuItem value="">全部表單</MenuItem>
                      {forms.map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <TextField
                  size="small"
                  label="業者名稱/登記編號"
                  value={factorySearch}
                  onChange={e => setFactorySearch(e.target.value)}
                  sx={{ minWidth: 200 }}
                  onKeyDown={e => e.key === 'Enter' && handlePreview()}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>狀態</InputLabel>
                  <Select
                    value={statusFilter}
                    label="狀態"
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">全部</MenuItem>
                    <MenuItem value="Pending">待填寫</MenuItem>
                    <MenuItem value="InProgress">填寫中</MenuItem>
                    <MenuItem value="Completed">已完成</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={previewing ? <CircularProgress size={16} /> : <SearchIcon />}
                  disabled={previewing}
                  onClick={handlePreview}
                >
                  {previewing ? '查詢中...' : '查詢任務'}
                </Button>
              </Box>

              {/* 預覽列表 */}
              {preview && (
                <Paper variant="outlined" sx={{ mb: 2 }}>
                  <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      共 <strong>{preview.length}</strong> 筆，已選 <strong>{selected.size}</strong> 筆
                    </Typography>
                    <Button size="small" onClick={toggleAll}>
                      {selected.size === preview.length ? '全部取消' : '全選'}
                    </Button>
                  </Box>
                  <Divider />
                  {preview.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      查無符合條件的任務
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={selected.size === preview.length && preview.length > 0}
                              indeterminate={selected.size > 0 && selected.size < preview.length}
                              onChange={toggleAll}
                            />
                          </TableCell>
                          <TableCell>業者名稱</TableCell>
                          <TableCell>登記編號</TableCell>
                          <TableCell>表單類型</TableCell>
                          <TableCell>督導機關</TableCell>
                          <TableCell>狀態</TableCell>
                          <TableCell>最後填表人</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.map(item => (
                          <TableRow key={item.taskId} hover selected={selected.has(item.taskId)}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={selected.has(item.taskId)}
                                onChange={() => toggleOne(item.taskId)}
                              />
                            </TableCell>
                            <TableCell>{item.factoryName}</TableCell>
                            <TableCell>{item.factoryRegistrationNo ?? '-'}</TableCell>
                            <TableCell>{item.formTypeName}</TableCell>
                            <TableCell>{item.agencyName}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={STATUS_LABEL[item.status]?.label ?? item.status}
                                color={STATUS_LABEL[item.status]?.color ?? 'default'}
                              />
                            </TableCell>
                            <TableCell>{item.submittedByUsername ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Paper>
              )}
            </Box>
          )}

          <Button
            variant="contained"
            color="error"
            startIcon={resetting ? <CircularProgress size={16} color="inherit" /> : <ResetIcon />}
            disabled={!canReset || resetting}
            onClick={() => setConfirmOpen(true)}
          >
            {resetting
              ? '重置中...'
              : resetMode === 'selective'
                ? `執行重置（${selected.size} 筆）`
                : '執行重置'}
          </Button>
        </>
      )}

      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          成功重置 {result.count} 筆督導任務。
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>確認重置</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button color="error" variant="contained" onClick={handleReset}>
            確認重置
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
