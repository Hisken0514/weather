/**
 * ProfileSettings - 個人資料設定
 */

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Avatar,
  Typography,
  Alert,
  Grid,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api/auth';
import PasskeySettings from "@/components/settings/PasskeySettings.tsx";

interface ProfileFormData {
  department: string;
  jobTitle: string;
  phoneNumber: string;
}

export function ProfileSettings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<ProfileFormData>({
    defaultValues: {
      department: user?.department || '',
      jobTitle: user?.jobTitle || '',
      phoneNumber: '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await authApi.updateProfile(data);
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>



      {/* User Info Display */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
        <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
          <PersonIcon sx={{ fontSize: 40 }} />
        </Avatar>
        <Box>
          <Typography variant="h6">{user?.username}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
          <Typography variant="caption" color="primary">
            {user?.roleName || '一般使用者'}
          </Typography>
        </Box>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          個人資料已更新
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="department"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="部門"
                  placeholder="您的部門"
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="jobTitle"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="職稱"
                  placeholder="您的職稱"
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="phoneNumber"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="電話"
                  placeholder="您的聯絡電話"
                />
              )}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? '儲存中...' : '儲存變更'}
          </Button>
        </Box>
      </form>

      <PasskeySettings/>
    </Box>

  );
}

export default ProfileSettings;
