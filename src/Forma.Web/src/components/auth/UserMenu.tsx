/**
 * UserMenu - 使用者選單組件
 * 顯示使用者資訊，提供個人資料編輯與登出功能
 */

import { useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';
import { ProfileSettings } from '@/components/settings/ProfileSettings';

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    window.location.href = `${import.meta.env.VITE_KPI_URL || '/iskpi'}/login`;
  };

  const handleOpenProfile = () => {
    handleClose();
    setProfileOpen(true);
  };

  if (!user) {
    return null;
  }

  // 取得使用者名稱的首字母作為頭像
  const avatarLetter = user.username?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{ ml: 2 }}
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.dark',
            fontSize: '1rem',
          }}
        >
          {avatarLetter}
        </Avatar>
      </IconButton>

      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 4,
          sx: {
            minWidth: 200,
            mt: 1,
          },
        }}
      >
        {/* 使用者資訊 */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {user.username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
        </Box>

        <Divider />

        <MenuItem onClick={handleOpenProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>個人資料</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>登出</ListItemText>
        </MenuItem>
      </Menu>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>個人資料</DialogTitle>
        <DialogContent dividers>
          <ProfileSettings />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default UserMenu;
