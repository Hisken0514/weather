// 系統資訊相關類型定義

export interface SystemInfoDto {
  applicationName: string;
  applicationVersion: string;
  environment: string;
  machineName: string;
  osDescription: string;
  processorCount: number;
  memory: MemoryUsageDto;
  disk: DiskUsageDto;
  database: DatabaseInfoDto;
  runtime: RuntimeInfoDto;
  serverTime: string;
  uptime: string;
}

export interface MemoryUsageDto {
  totalMemoryMB: number;
  usedMemoryMB: number;
  availableMemoryMB: number;
  usagePercentage: number;
  gcTotalMemoryMB: number;
  gcGen0Collections: number;
  gcGen1Collections: number;
  gcGen2Collections: number;
}

export interface DiskUsageDto {
  driveName: string;
  totalSpaceGB: number;
  usedSpaceGB: number;
  availableSpaceGB: number;
  usagePercentage: number;
}

export interface DatabaseInfoDto {
  provider: string;
  serverVersion: string;
  database: string;
  connectionState: string;
  pendingMigrations: number;
  appliedMigrations: number;
}

export interface RuntimeInfoDto {
  frameworkDescription: string;
  runtimeIdentifier: string;
  processArchitecture: string;
  isServerGC: boolean;
  threadCount: number;
  handleCount: number;
}

export interface HealthStatusDto {
  status: 'Healthy' | 'Degraded' | 'Unhealthy';
  totalDuration: string;
  components: HealthComponentsDto;
}

export interface HealthComponentsDto {
  database: ComponentHealthDto;
  memory: ComponentHealthDto;
  disk: ComponentHealthDto;
}

export interface ComponentHealthDto {
  status: 'Healthy' | 'Degraded' | 'Unhealthy';
  description?: string;
  duration?: string;
}
