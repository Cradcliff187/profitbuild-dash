/**
 * Error boundary for schedule view
 */

import React, { Component, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary to catch and handle schedule feature errors
 * Prevents entire app crash if schedule feature fails
 */
export class ScheduleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service
    console.error('[Schedule Feature Error]', error, errorInfo);
    
    // Send to Sentry or similar service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: { feature: 'schedule' },
        extra: errorInfo
      });
    }
  }
  
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Schedule Temporarily Unavailable</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading the schedule. Your project data is safe.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 text-left bg-muted p-4 rounded text-xs">
              <summary className="cursor-pointer font-semibold mb-2">
                Error Details (Dev Only)
              </summary>
              <pre className="overflow-auto">
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={this.handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            If this problem persists, please contact support.
          </p>
        </Card>
      );
    }
    
    return this.props.children;
  }
}

// Add Sentry type to window
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
    };
  }
}

