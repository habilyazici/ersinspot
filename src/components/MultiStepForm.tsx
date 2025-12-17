import { ReactNode } from 'react';
import { Check } from 'lucide-react@0.487.0';

// Inline cn function to avoid import issues
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

interface Step {
  id: number;
  title: string;
  icon: React.ElementType;
}

interface MultiStepFormProps {
  steps: Step[];
  currentStep: number;
  children: ReactNode;
  onStepClick?: (stepId: number) => void;
  canNavigate?: (stepId: number) => boolean;
}

export function MultiStepForm({ 
  steps, 
  currentStep, 
  children,
  onStepClick,
  canNavigate = () => true 
}: MultiStepFormProps) {
  const completedSteps = currentStep - 1;
  const progressPercentage = (completedSteps / (steps.length - 1)) * 100;

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="relative">
          {/* Background Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 rounded-full"></div>
          
          {/* Progress Line */}
          <div 
            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[#f97316] to-[#ea580c] -translate-y-1/2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const isCompleted = index + 1 < currentStep;
              const isCurrent = index + 1 === currentStep;
              const isClickable = canNavigate(step.id);
              const StepIcon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex flex-col items-center gap-2 group transition-all",
                    isClickable ? "cursor-pointer" : "cursor-not-allowed"
                  )}
                >
                  {/* Circle */}
                  <div
                    className={cn(
                      "relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-4",
                      isCompleted && "bg-[#f97316] border-[#f97316] shadow-lg shadow-orange-500/50",
                      isCurrent && "bg-white border-[#f97316] shadow-lg shadow-orange-500/30 scale-110",
                      !isCompleted && !isCurrent && "bg-white border-gray-300",
                      isClickable && !isCompleted && !isCurrent && "group-hover:border-[#f97316] group-hover:scale-105"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <StepIcon 
                        className={cn(
                          "w-5 h-5 transition-colors",
                          isCurrent && "text-[#f97316]",
                          !isCurrent && "text-gray-400"
                        )}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="text-center min-w-[100px]">
                    <p 
                      className={cn(
                        "text-xs transition-colors",
                        isCurrent && "text-[#f97316] font-semibold",
                        isCompleted && "text-gray-700 font-medium",
                        !isCompleted && !isCurrent && "text-gray-400"
                      )}
                    >
                      {step.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {children}
      </div>
    </div>
  );
}