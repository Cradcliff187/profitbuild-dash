import { MobileTimeTracker } from '@/components/time-tracker/MobileTimeTracker';

const TimeTracker = () => {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] overflow-x-hidden">
      <MobileTimeTracker />
    </div>
  );
};

export default TimeTracker;
