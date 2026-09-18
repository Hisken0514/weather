/**
 * SettingsPage - 設定頁面
 * 包含個人資料、組織管理（管理員）、計畫管理（管理員）
 */

import { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
} from '@mui/material';
import {
  Person as ProfileIcon,
  Business as OrganizationsIcon,
  Folder as ProjectsIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import { MainLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/authStore';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { OrganizationsSettings } from '@/components/settings/OrganizationsSettings';
import { ProjectsSettings } from '@/components/settings/ProjectsSettings';
import { PasskeySettings } from '@/components/settings/PasskeySettings';
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user ? (BigInt(user.permissions ?? 0) & 7n) === 7n : false;
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <MainLayout title="設定">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          設定
        </Typography>
        <Typography variant="body1" color="text.secondary">
          管理您的帳號和系統設定
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<ProfileIcon />}
              iconPosition="start"
              label="個人資料"
            />
            <Tab
              icon={<KeyIcon />}
              iconPosition="start"
              label="安全金鑰"
            />
            {isAdmin && (
              <Tab
                icon={<OrganizationsIcon />}
                iconPosition="start"
                label="組織管理"
              />
            )}
            {isAdmin && (
              <Tab
                icon={<ProjectsIcon />}
                iconPosition="start"
                label="計畫管理"
              />
            )}
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <ProfileSettings />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <PasskeySettings />
          </TabPanel>
          {isAdmin && (
            <TabPanel value={activeTab} index={2}>
              <OrganizationsSettings />
            </TabPanel>
          )}
          {isAdmin && (
            <TabPanel value={activeTab} index={3}>
              <ProjectsSettings />
            </TabPanel>
          )}
        </Box>
      </Paper>
    </MainLayout>
  );
}

export default SettingsPage;
