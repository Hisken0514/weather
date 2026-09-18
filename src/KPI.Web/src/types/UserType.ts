// types/UserType.ts

export interface UserData {
    nickname: string;
    email: string;
    token: string;
}

export interface UserProfileDto {
    userId: string;
    nickname: string;
    email: string;
    organizationId: number;
    organizationName: string;
    organizationTypeId: number;
    role: 'admin' | 'company';
}

export interface LoginResult {
    success: boolean;
    message?: string;

    token?: string;
    refreshToken?: string;
    nickname?: string;
    email?: string;

    // 後端新增的結構化欄位
    warningMessage?: string;
    passwordExpiryAt?: string;   // ISO 字串
    daysUntilExpiry?: number;
    forceChangePassword?: boolean;
    needEmailVerification?: boolean;
}