'use client'
import React, {ReactNode, useState, createContext, useContext, ReactElement} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 定義通用表單資料型別，以避免使用 any
export type FormDataType = Record<string, unknown>;

/**
 * 步驟流程的 Context 型別定義
 *
 * @interface StepContextType
 * @property {number} currentStep 當前步驟索引
 * @property {number} totalSteps 總步驟數量
 * @property {(step: number) => void} goToStep 跳至指定步驟
 * @property {() => void} nextStep 移至下一步
 * @property {() => void} prevStep 返回前一步
 * @property {FormDataType} stepData 步驟資料
 * @property {(data: FormDataType) => void} updateStepData 更新步驟資料
 */
interface StepContextType {
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  stepData: FormDataType;
  updateStepData: (data: FormDataType) => void;
}


const StepContext = createContext<StepContextType>({
  currentStep: 0,
  totalSteps: 0,
  goToStep: () => {},
  nextStep: () => {},
  prevStep: () => {},
  stepData: {},
  updateStepData: () => {}
});


export const useStepContext = (): StepContextType => useContext(StepContext);

/**
 * MultiStepForm 多步驟表單元件的屬性
 *
 * @interface MultiStepFormProps
 * @property {ReactNode} children 子元件
 * @property {FormDataType} [initialData] 初始表單資料
 * @property {(formData: FormDataType) => void} [onComplete] 表單完成時的回呼函式
 * @property {number} [defaultStep] 預設起始步驟
 */
interface MultiStepFormProps {
  children: ReactNode;
  initialData?: FormDataType;
  onComplete?: (formData: FormDataType) => void;
  defaultStep?: number;
  totalStepsCount: number;
}
/**
 * 步驟容器元件的屬性
 *
 * @interface StepsContainerProps
 * @property {ReactNode} children 子元件
 * @property {boolean} [vertical] 是否為垂直排列
 * @property {string} [className] 自定義樣式類別
 */
interface StepsContainerProps {
  children: ReactNode;
  vertical?: boolean;
  className?: string;
}
/**
 * 單一步驟元件的屬性
 *
 * @interface StepProps
 * @property {ReactNode} children 子元件
 * @property {'default' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'} [status] 步驟狀態樣式
 * @property {() => void} [onClick] 點擊事件處理函式
 * @property {boolean} [disabled] 是否禁用
 * @property {string} [className] 自定義樣式類別
 */
interface StepProps {
  children: ReactNode;
  status?: 'default' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}
/**
 * 每個步驟對應的內容元件屬性
 *
 * @interface StepContentProps
 * @property {number} step 步驟索引
 * @property {ReactNode} children 此步驟的內容
 */
interface StepContentProps {
  step: number;
  children: ReactNode;
}
/**
 * 步驟動畫容器元件屬性
 *
 * @interface StepAnimationProps
 * @property {ReactNode} children 子元件
 */
interface StepAnimationProps {
  children: ReactNode;
}
/**
 * 導覽控制按鈕的屬性
 *
 * @interface StepNavigationProps
 * @property {string} [prevLabel] 上一步按鈕文字
 * @property {string} [nextLabel] 下一步按鈕文字
 * @property {() => boolean | Promise<boolean>} [onNext] 點擊下一步時的處理函式，回傳 false 可阻止切換
 * @property {() => boolean | Promise<boolean>} [onPrev] 點擊上一步時的處理函式，回傳 false 可阻止切換
 * @property {boolean} [isNextLoading] 是否顯示下一步載入中
 * @property {boolean} [isPrevLoading] 是否顯示上一步載入中
 * @property {boolean} [hideNext] 是否隱藏下一步按鈕
 * @property {boolean} [hidePrev] 是否隱藏上一步按鈕
 */
interface StepNavigationProps {
  prevLabel?: string;
  nextLabel?: string;
  onNext?: () => boolean | Promise<boolean>; // Return false to prevent navigation
  onPrev?: () => boolean | Promise<boolean>; // Return false to prevent navigation
  isNextLoading?: boolean;
  isPrevLoading?: boolean;
  hideNext?: boolean;
  hidePrev?: boolean;
}
/**
 * 步驟內容的卡片容器元件屬性
 *
 * @interface StepCardProps
 * @property {string | ReactNode} [title] 卡片標題
 * @property {ReactNode} children 卡片內容
 * @property {string} [className] 自定義樣式類別
 */
interface StepCardProps {
  title?: string | ReactNode;
  children: ReactNode;
  className?: string;
}

export function MultiStepForm({
  children,
  initialData = {},
  onComplete,
  defaultStep = 0,
  totalStepsCount
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState<number>(defaultStep);
  const [stepData, setStepData] = useState<FormDataType>(initialData);

  // Count total steps
   const totalSteps = totalStepsCount || React.Children.count(children);

  // Navigate to a specific step
  const goToStep = (step: number): void => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  };

  // Go to next step
  const nextStep = (): void => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (onComplete) {
      onComplete(stepData);
    }
  };

  // Go to previous step
  const prevStep = (): void => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Update form data
  const updateStepData = (data: FormDataType): void => {
    setStepData(prev => ({
      ...prev,
      ...data
    }));
  };

  // Context value
  const contextValue: StepContextType = {
    currentStep,
    totalSteps,
    goToStep,
    nextStep,
    prevStep,
    stepData,
    updateStepData
  };

  return (
    <StepContext.Provider value={contextValue}>
      <div className="flex flex-col w-full">
        {children}
      </div>
    </StepContext.Provider>
  );
}

export function StepsContainer({
  children,
  vertical = false,
  className = ""
}: StepsContainerProps) {
  return (
    <ul className={`steps ${vertical ? 'steps-vertical' : ''} w-full ${className}`}>
      {children}
    </ul>
  );
}

// Single Step Component
export function Step({
  children,
  status = 'success',
  onClick,
  disabled = false,
  className = ""
}: StepProps) {
  const statusClass = status !== 'default' ? `step-${status}` : '';

  return (
    <li
      className={`step text-black ${statusClass} ${className} ${disabled ? 'opacity-100' : 'cursor-pointer'}`}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </li>
  );
}

// StepContent - Content for each step that will be shown/hidden based on current step
export function StepContent({
  step,
  children
}: StepContentProps) {
  const { currentStep } = useStepContext();

  if (step !== currentStep) return null;

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

// StepAnimation - Container for animating between steps
export function StepAnimation({
  children
}: StepAnimationProps) {
  const { currentStep } = useStepContext();

  return (
    <AnimatePresence mode="wait">
      <div key={currentStep} className="w-full">
        {children}
      </div>
    </AnimatePresence>
  );
}

// Navigation Helper Component
export function StepNavigation({
  prevLabel = "Previous",
  nextLabel = "Next",
  onNext,
  onPrev,
  isNextLoading = false,
  isPrevLoading = false,
  hideNext = false,
  hidePrev = false
}: StepNavigationProps) {
  const { nextStep, prevStep, currentStep, totalSteps } = useStepContext();

  const handleNext = async (): Promise<void> => {
    if (onNext) {
      const canProceed = await onNext();
      if (canProceed !== false) {
        nextStep();
      }
    } else {
      nextStep();
    }
  };

  const handlePrev = async (): Promise<void> => {
    if (onPrev) {
      const canProceed = await onPrev();
      if (canProceed !== false) {
        prevStep();
      }
    } else {
      prevStep();
    }
  };

  return (
    <div className="flex justify-between w-full mt-6">
      {!hidePrev && currentStep > 0 && (
        <button
          className="btn btn-outline-primary"
          onClick={handlePrev}
          disabled={isPrevLoading}
        >
          {isPrevLoading ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Loading...
            </>
          ) : prevLabel}
        </button>
      )}

      {!hideNext && (
        <button
          className="btn btn-primary ml-auto"
          onClick={handleNext}
          disabled={isNextLoading}
        >
          {isNextLoading ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Loading...
            </>
          ) : currentStep === totalSteps - 1 ? "Complete" : nextLabel}
        </button>
      )}
    </div>
  );
}

// Card Component for Step Content
export function StepCard({
  title,
  children,
  className = ""
}: StepCardProps) {
  return (
    <div className={`card w-full bg-base-200 shadow-md text-base-content ${className}`}>
      <div className="card-body bg-white">
        {title && (
          typeof title === 'string'
            ? <h2 className="card-title text-primary">{title}</h2>
            : title
        )}
        {children}
      </div>
    </div>
  );
}


const StepIndicatorComponent = ({
  steps
}: {
  steps: { title: string }[]
}): ReactElement => {
  const { currentStep, goToStep } = useStepContext();

  return (
    <StepsContainer className="mb-8">
      {steps.map((step, index) => {
        // 設定步驟狀態
        let status: 'default' | 'primary' | 'success' = 'default';
        if (currentStep === index) status = 'primary';
        else if (index < currentStep) status = 'success';

        return (
          <Step
            key={index}
            status={status}
            onClick={() => {
              // 只允許跳轉到已完成的步驟
              if (index < currentStep) {
                goToStep(index);
              }
            }}
            disabled={!(index < currentStep)}
          >
            {step.title}
          </Step>
        );
      })}
    </StepsContainer>
  );
};

///
function StepNavigationWrapper({
  nextLabel,
  prevLabel,
  isNextLoading,
  isPrevLoading,
  hidePrev,
  hideNext,
  onSubmit,
  customNavigation,
  nextDisabledCondition,
  prevDisabledCondition
}: {
  nextLabel?: string;
  prevLabel?: string;
  isNextLoading?: boolean;
  isPrevLoading?: boolean;
  hidePrev?: boolean;
  hideNext?: boolean;
  onSubmit: (stepData: FormDataType, updateStepData: (data: FormDataType) => void) => boolean | Promise<boolean>;
  nextDisabledCondition?: (stepData: FormDataType) => boolean;
  prevDisabledCondition?: (stepData: FormDataType) => boolean;
  customNavigation?: {
    enabled: boolean;
    targetStep?: number;
    label?: string;
    className?: string;
    disabled?: boolean;
    isLoading?: boolean;
    onNavigate?: (stepData: FormDataType, updateStepData: (data: FormDataType) => void) => boolean | Promise<boolean>;
    disabledCondition?: (stepData: FormDataType) => boolean;
  }
}): ReactElement {
  const { stepData, updateStepData, goToStep, nextStep, prevStep, currentStep } = useStepContext();

  // 計算按鈕是否應該被禁用
  const isCustomButtonDisabled = () => {
    if (!customNavigation) return true;

    if (customNavigation.disabled !== undefined) {
      return customNavigation.disabled;
    }

    if (customNavigation.disabledCondition) {
      return customNavigation.disabledCondition(stepData);
    }

    return false;
  };

  // 檢查下一步按鈕是否應該禁用
  const isNextButtonDisabled = () => {
    if (isNextLoading) return true;

    if (nextDisabledCondition) {
      return nextDisabledCondition(stepData);
    }

    return false;
  };

  // 檢查上一步按鈕是否應該禁用
  const isPrevButtonDisabled = () => {
    if (isPrevLoading) return true;

    if (prevDisabledCondition) {
      return prevDisabledCondition(stepData);
    }

    return false;
  };

  // 處理自定義導航
  const handleCustomNavigation = async () => {
    if (!customNavigation || !customNavigation.enabled || isCustomButtonDisabled()) return;

    let canProceed = true;
    if (customNavigation.onNavigate) {
      canProceed = await customNavigation.onNavigate(stepData, updateStepData);
    }

    if (canProceed && customNavigation.targetStep !== undefined) {
      goToStep(customNavigation.targetStep);
    }
  };

  // 處理下一步導航
  const handleNext = async () => {
    if (isNextButtonDisabled()) return;

    const canProceed = await onSubmit(stepData, updateStepData);
    if (canProceed !== false) {
      nextStep();
    }
  };

  // 處理上一步導航
  const handlePrev = async () => {
    if (isPrevButtonDisabled()) return;

    prevStep();
  };

  // 確保函數始終返回 ReactElement
  return (
    <div className="flex flex-col w-full">
      {/* 標準導航按鈕 */}
      <div className="flex justify-between w-full mt-6">
        {!hidePrev && currentStep > 0 && (
          <button
            className="btn btn-outline-primary"
            onClick={handlePrev}
            disabled={isPrevButtonDisabled()}
          >
            {isPrevLoading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Loading...
              </>
            ) : prevLabel}
          </button>
        )}

        {!hideNext && (
          <button
            className="btn btn-primary ml-auto"
            onClick={handleNext}
            disabled={isNextButtonDisabled()}
          >
            {isNextLoading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Loading...
              </>
            ) : nextLabel}
          </button>
        )}
      </div>

      {/* 自定義導航按鈕 */}
      {customNavigation && customNavigation.enabled && (
        <button
          className={`btn ${customNavigation.className || 'btn-secondary'} w-full mt-2`}
          onClick={handleCustomNavigation}
          disabled={isCustomButtonDisabled() || customNavigation.isLoading}
        >
          {customNavigation.isLoading ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Loading...
            </>
          ) : (
            customNavigation.label || '返回列表'
          )}
        </button>
      )}
    </div>
  );
}

export {
  StepNavigationWrapper,
  StepContext,
  StepIndicatorComponent
};
