import { MobileTimeTracker } from '@/components/time-tracker/MobileTimeTracker';

/**
 * /time-tracker/timer — the demoted-but-supported timer surface (PR 3).
 * Mounts the untouched MobileTimeTracker. Do not remove; do not re-promote
 * to the landing without user-research evidence (CLAUDE.md timer rule).
 */
const TimerPage = () => {
  return <MobileTimeTracker timerOnly />;
};

export default TimerPage;
