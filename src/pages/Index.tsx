import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading...</span>
      </div>
    </div>
  );
};

export default Index;
