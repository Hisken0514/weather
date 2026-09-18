/**
 * useFormTheme - 合併計畫主題與表單設定
 * 計畫主題為基底，若表單啟用 useCustomTheme 則以表單設定覆寫
 */

import { useMemo } from 'react';
import type { FormSettings } from '@/types/form';
import type { ProjectTheme } from '@/types/api/projects';

export interface ResolvedTheme {
  logo?: string;
  logoFileId?: string;
  logoBackgroundColor?: string;
  backgroundColor?: string;
  brandColor?: string;
  questionColor?: string;
  inputColor?: string;
  inputBorderColor?: string;
  cardBackgroundColor?: string;
  cardBorderColor?: string;
  cardBorderRadius?: number;
  hideProgressBar?: boolean;
  fontFamily?: string;
}

export function resolveTheme(
  projectTheme: ProjectTheme | undefined,
  formSettings: FormSettings | undefined
): ResolvedTheme {
  const base: ResolvedTheme = {
    logo: projectTheme?.logo,
    logoFileId: projectTheme?.logoFileId,
    logoBackgroundColor: projectTheme?.logoBackgroundColor,
    backgroundColor: projectTheme?.backgroundColor,
    brandColor: projectTheme?.brandColor,
    questionColor: projectTheme?.questionColor,
    inputColor: projectTheme?.inputColor,
    inputBorderColor: projectTheme?.inputBorderColor,
    cardBackgroundColor: projectTheme?.cardBackgroundColor,
    cardBorderColor: projectTheme?.cardBorderColor,
    cardBorderRadius: projectTheme?.cardBorderRadius,
    hideProgressBar: projectTheme?.hideProgressBar,
    fontFamily: projectTheme?.fontFamily,
  };

  if (!formSettings?.useCustomTheme) {
    return base;
  }

  // Form overrides
  return {
    ...base,
    backgroundColor: formSettings.backgroundColor || base.backgroundColor,
    fontFamily: formSettings.headerStyle?.fontFamily || base.fontFamily,
    // headerImage from form acts as logo override
    logo: formSettings.headerImage || base.logo,
  };
}

export function useFormTheme(
  projectTheme: ProjectTheme | undefined,
  formSettings: FormSettings | undefined
): ResolvedTheme {
  return useMemo(
    () => resolveTheme(projectTheme, formSettings),
    [projectTheme, formSettings]
  );
}

/** Parse project settings JSON to ProjectTheme */
export function parseProjectTheme(settingsJson: string | undefined | null): ProjectTheme | undefined {
  if (!settingsJson) return undefined;
  try {
    return JSON.parse(settingsJson) as ProjectTheme;
  } catch {
    return undefined;
  }
}
