/**
 * MainLayout - 主要應用佈局
 */

import { useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton, Divider,
  useTheme, useMediaQuery, Link,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AdminPanelSettings as SystemSettingsIcon,
  OpenInNew as OpenInNewIcon,
  FactCheck as SupervisionIcon,
  RateReview as AgencyReviewIcon,
  ManageAccounts as AdminSupervisionIcon,
  BarChart as StatsIcon,
  Map as MapIcon,
  TuneOutlined as RiskScoringIcon,
  Leaderboard as FactoryRiskRankingIcon,
  TableChart as FactoryRiskDataIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router';
import { UserMenu } from '@/components/auth';
import { useAuthStore } from '@/stores/authStore';

const DRAWER_WIDTH = 280;

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isAdmin = user ? (BigInt(user.permissions ?? 0) & 7n) === 7n : false;

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const isSelected = (path: string) => location.pathname === path;
  const isStartsWith = (path: string) => location.pathname.startsWith(path);

  const navItemSx = {
    borderRadius: 2,
    '&.Mui-selected': {
      backgroundColor: 'primary.main',
      color: 'white',
      '&:hover': { backgroundColor: 'primary.dark' },
      '& .MuiListItemIcon-root': { color: 'white' },
    },
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <img src={`${import.meta.env.BASE_URL}risk_logo.svg`} alt="危險品風險分級資料庫" style={{ width: '100%', maxHeight: 64 }} />
      </Box>

      <Divider />

      {/* 督導 Section */}
      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {/* 我的督導任務 */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => handleNavClick('/my-tasks')}
            selected={isSelected('/my-tasks')}
            sx={navItemSx}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SupervisionIcon />
            </ListItemIcon>
            <ListItemText primary="我的督導任務" />
          </ListItemButton>
        </ListItem>

        {/* 機關複查作業 */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => handleNavClick('/agency-review')}
            selected={isSelected('/agency-review')}
            sx={navItemSx}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <AgencyReviewIcon />
            </ListItemIcon>
            <ListItemText primary="機關複查作業" />
          </ListItemButton>
        </ListItem>

        {/* 督導管理（Admin only） */}
        {isAdmin && (
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavClick('/supervision')}
              selected={isSelected('/supervision')}
              sx={navItemSx}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AdminSupervisionIcon />
              </ListItemIcon>
              <ListItemText primary="督導管理" />
            </ListItemButton>
          </ListItem>
        )}

        {/* 督導成效統計（Admin only） */}
        {isAdmin && (
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavClick('/supervision-stats')}
              selected={isSelected('/supervision-stats')}
              sx={navItemSx}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <StatsIcon />
              </ListItemIcon>
              <ListItemText primary="成效統計" />
            </ListItemButton>
          </ListItem>
        )}

        {/* 危險品風險分級地圖（Admin only） */}
        {isAdmin && (
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavClick('/hazmat-map')}
              selected={isSelected('/hazmat-map')}
              sx={navItemSx}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <MapIcon />
              </ListItemIcon>
              <ListItemText primary="危險品風險分級地圖" />
            </ListItemButton>
          </ListItem>
        )}

        {/* 風險評分標準管理（Admin only） */}
        {isAdmin && (
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavClick('/risk-scoring')}
              selected={isSelected('/risk-scoring')}
              sx={navItemSx}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <RiskScoringIcon />
              </ListItemIcon>
              <ListItemText primary="風險評分標準管理" />
            </ListItemButton>
          </ListItem>
        )}

        {/* 全台工廠風險排名（Admin only） */}
        {isAdmin && (
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavClick('/factory-risk-ranking')}
              selected={isSelected('/factory-risk-ranking')}
              sx={navItemSx}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <FactoryRiskRankingIcon />
              </ListItemIcon>
              <ListItemText primary="全台工廠風險排名" />
            </ListItemButton>
          </ListItem>
        )}

        {/* 工廠原始資料維護（Admin only） */}
        {isAdmin && (
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavClick('/factory-risk-data')}
              selected={isSelected('/factory-risk-data')}
              sx={navItemSx}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <FactoryRiskDataIcon />
              </ListItemIcon>
              <ListItemText primary="工廠原始資料維護" />
            </ListItemButton>
          </ListItem>
        )}
      </List>

      <Divider />

      {/* 系統設定（Admin） */}
      {isAdmin && (
        <>
          <List sx={{ px: 1 }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleNavClick('/system-settings')}
                selected={isStartsWith('/system-settings')}
                sx={navItemSx}
              >
                <ListItemIcon sx={{ minWidth: 40 }}><SystemSettingsIcon /></ListItemIcon>
                <ListItemText primary="系統設定" />
              </ListItemButton>
            </ListItem>
          </List>
          <Divider />
        </>
      )}

      {/* 返回 KPI 系統 */}
      <List sx={{ px: 1, pb: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            component="a"
            href={import.meta.env.VITE_KPI_URL || '/iskpi'}
            sx={{ borderRadius: 2, color: 'text.secondary' }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              <OpenInNewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="前往 KPI 系統"
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* AppBar + Drawers + Content 放在同一個 row 裡，footer 獨立在 column 底部 */}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
      <AppBar
        position="fixed"
        color="default"
        elevation={1}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title || ''}
          </Typography>
          <UserMenu />
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: 'grey.50',
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>{children}</Box>
      </Box>
      </Box>{/* end row */}

      {/* 頁尾：在 column 最底部，全寬橫跨側邊欄與內容區 */}
      <Box
        component="footer"
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 3,
          px: 4,
          textAlign: 'center',
          position: 'relative',
          flexShrink: 0,
          ml: { md: `${DRAWER_WIDTH}px` },
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          ※本網所提供之電子檔案部分為 .PDF 格式，如無法閱讀，請自行下載安裝免費軟體「中文版Adobe PDF Reader」
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          本網站由經濟部產業園區管理局「114年度所轄園區工廠風險評估暨管理躍升計畫」之委辦單位「中華民國工業安全衛生協會」維護管理
        </Typography>
        <Typography variant="body2">
          Copyright © {new Date().getFullYear()} - All right reserved
        </Typography>
        <Link
          href="https://accessibility.moda.gov.tw/Applications/Detail?category=20250811104030"
          title="無障礙網站"
          sx={{ position: 'absolute', bottom: 8, right: 80 }}
        >
          <Box
            component="img"
            src={`${import.meta.env.BASE_URL}AA21.svg`}
            width={88}
            height={33}
            alt="通過AA無障礙網頁檢測"
          />
        </Link>
      </Box>
    </Box>
  );
}

export default MainLayout;
