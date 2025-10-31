import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BrandedLoader } from '@/components/ui/branded-loader';

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
  return <BrandedLoader message="Loading..." />;
};

export default Index;
