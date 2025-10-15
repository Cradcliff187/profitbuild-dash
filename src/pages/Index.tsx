import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect authenticated users to dashboard
        navigate('/');
      } else {
        // Redirect unauthenticated users to auth page
        navigate('/auth');
      }
    }
  }, [user, loading, navigate]);

  // Show loading while determining auth state
  return <LoadingSpinner variant="page" message="Loading..." />;
};

export default Index;
