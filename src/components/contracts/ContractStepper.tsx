import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ContractStep = 'configure' | 'preview' | 'complete';

interface ContractStepperProps {
  currentStep: ContractStep;
}

const STEPS: { id: ContractStep; label: string; number: number }[] = [
  { id: 'configure', label: 'Configure', number: 1 },
  { id: 'preview', label: 'Preview', number: 2 },
  { id: 'complete', label: 'Complete', number: 3 },
];

const STEP_ORDER: ContractStep[] = ['configure', 'preview', 'complete'];

export function ContractStepper({ currentStep }: ContractStepperProps) {
  const getStepStatus = (stepId: ContractStep): 'completed' | 'current' | 'upcoming' => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    const stepIndex = STEP_ORDER.indexOf(stepId);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex items-center justify-center mb-6">
      {STEPS.map((step, index) => {
        const status = getStepStatus(step.id);
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                  status === 'completed' && 'bg-green-500 border-green-500 text-white',
                  status === 'current' && 'bg-blue-500 border-blue-500 text-white',
                  status === 'upcoming' && 'bg-gray-100 border-gray-300 text-gray-400'
                )}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 font-medium',
                  status === 'current' && 'text-blue-600',
                  status === 'completed' && 'text-green-600',
                  status === 'upcoming' && 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-16 h-0.5 mx-2 mb-5',
                  getStepStatus(STEPS[index + 1].id) !== 'upcoming'
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
