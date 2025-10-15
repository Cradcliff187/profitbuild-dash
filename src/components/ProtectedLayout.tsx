import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Navigation from './Navigation';

export default function ProtectedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingSpinner variant="page" message="Loading..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navigation />
      <main className="w-full mobile-safe-padding py-4 sm:py-6 md:py-8">
        <Outlet />
      </main>
    </>
  );
}