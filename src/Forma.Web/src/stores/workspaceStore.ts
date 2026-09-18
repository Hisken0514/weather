/**
 * Workspace Store - 工作區狀態管理
 * 管理當前選擇的年度和計畫
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectListDto } from '@/types/api/projects';

interface WorkspaceState {
  // 狀態
  selectedYear: number;
  selectedProjectId: string | null;
  selectedProject: ProjectListDto | null;
  recentProjects: ProjectListDto[];

  // 計畫列表快取
  projects: ProjectListDto[];
  projectsLoadedYear: number | null;
  projectsLoading: boolean;

  // 選單展開狀態
  formsMenuExpanded: boolean;
  projectMgmtMenuExpanded: boolean;

  // 動作
  setYear: (year: number) => void;
  setProject: (project: ProjectListDto | null) => void;
  addRecentProject: (project: ProjectListDto) => void;
  clearWorkspace: () => void;
  setFormsMenuExpanded: (expanded: boolean) => void;
  setProjectMgmtMenuExpanded: (expanded: boolean) => void;
  setProjects: (projects: ProjectListDto[], year: number) => void;
  setProjectsLoading: (loading: boolean) => void;
}

const currentYear = new Date().getFullYear();

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // 初始狀態
      selectedYear: currentYear,
      selectedProjectId: null,
      selectedProject: null,
      recentProjects: [],
      projects: [],
      projectsLoadedYear: null,
      projectsLoading: false,
      formsMenuExpanded: true,
      projectMgmtMenuExpanded: false,

      // 設定年度
      setYear: (year: number) => {
        set({ selectedYear: year });
        // 年度變更時，如果當前計畫不是該年度的，清除選擇
        const { selectedProject } = get();
        if (selectedProject && selectedProject.year !== year) {
          set({ selectedProjectId: null, selectedProject: null });
        }
      },

      // 設定計畫
      setProject: (project: ProjectListDto | null) => {
        set({
          selectedProjectId: project?.id || null,
          selectedProject: project,
        });
        if (project) {
          // 更新年度為計畫的年度
          set({ selectedYear: project.year });
          // 加入最近使用
          get().addRecentProject(project);
        }
      },

      // 加入最近使用的計畫
      addRecentProject: (project: ProjectListDto) => {
        const { recentProjects } = get();
        const filtered = recentProjects.filter(p => p.id !== project.id);
        const updated = [project, ...filtered].slice(0, 5); // 最多保留 5 個
        set({ recentProjects: updated });
      },

      // 清除工作區
      clearWorkspace: () => {
        set({
          selectedYear: currentYear,
          selectedProjectId: null,
          selectedProject: null,
        });
      },

      // 設定選單展開狀態
      setFormsMenuExpanded: (expanded: boolean) => {
        set({ formsMenuExpanded: expanded });
      },
      setProjectMgmtMenuExpanded: (expanded: boolean) => {
        set({ projectMgmtMenuExpanded: expanded });
      },

      // 設定計畫列表
      setProjects: (projects: ProjectListDto[], year: number) => {
        set({ projects, projectsLoadedYear: year });
      },
      setProjectsLoading: (loading: boolean) => {
        set({ projectsLoading: loading });
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        selectedYear: state.selectedYear,
        selectedProjectId: state.selectedProjectId,
        recentProjects: state.recentProjects,
      }),
    }
  )
);

export default useWorkspaceStore;
