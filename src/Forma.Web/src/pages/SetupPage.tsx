/**
 * SetupPage - 系統首次設定頁面
 * 用於建立第一位系統管理員帳號
 */

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';

interface SetupFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  department: string;
  jobTitle: string;
}

export function SetupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetupFormData>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      department: '系統管理',
      jobTitle: '系統管理員',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: SetupFormData) => {
    if (data.password !== data.confirmPassword) {
      setError('密碼不一致');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authApi.setupAdmin({
        username: data.username,
        email: data.email,
        password: data.password,
        department: data.department,
        jobTitle: data.jobTitle,
      });

      // 儲存 token 到 localStorage 和 store
      localStorage.setItem('accessToken', response.accessToken ?? '');
      localStorage.setItem('refreshToken', response.refreshToken ?? '');

      // 使用登入來設定 store 狀態
      await login({ emailOrUsername: data.email, password: data.password });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : '設定失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.100',
        p: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          maxWidth: 500,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            color: 'white',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Forma
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            系統首次設定
          </Typography>
        </Box>

        {/* Stepper */}
        <Box sx={{ pt: 3, px: 4 }}>
          <Stepper activeStep={0} alternativeLabel>
            <Step completed={false}>
              <StepLabel>建立管理員帳號</StepLabel>
            </Step>
            <Step>
              <StepLabel>完成設定</StepLabel>
            </Step>
          </Stepper>
        </Box>

        {/* Form */}
        <Box sx={{ p: 4 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            歡迎使用 Forma！請建立第一位系統管理員帳號。
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="使用者名稱"
              {...register('username', {
                required: '請輸入使用者名稱',
                minLength: { value: 2, message: '名稱至少 2 個字元' },
              })}
              error={!!errors.username}
              helperText={errors.username?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              {...register('email', {
                required: '請輸入 Email',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '請輸入有效的 Email',
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="密碼"
              type={showPassword ? 'text' : 'password'}
              {...register('password', {
                required: '請輸入密碼',
                minLength: { value: 8, message: '密碼至少 8 個字元' },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: '密碼須包含大小寫字母和數字',
                },
              })}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="確認密碼"
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword', {
                required: '請確認密碼',
                validate: (value) => value === password || '密碼不一致',
              })}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="部門"
              {...register('department')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="職稱"
              {...register('jobTitle')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BadgeIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : '建立管理員帳號'}
            </Button>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}

export default SetupPage;
