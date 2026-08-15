/**
 * Minimal ambient declarations for the Google scripts the Drive import loads
 * at runtime (gapi loader, Google Identity Services token client, Picker).
 * Only the surface area we actually call is typed — deliberately not a full
 * @types/google.picker replacement (the Picker builder is used through a
 * loosely-typed namespace object).
 */

export {};

declare global {
  interface GoogleOAuthTokenResponse {
    access_token?: string;
    expires_in?: number | string;
    error?: string;
    error_description?: string;
  }

  interface GoogleOAuthTokenClient {
    requestAccessToken: (overrides?: { prompt?: string }) => void;
  }

  interface Window {
    gapi?: {
      load: (name: string, callback: () => void) => void;
    };
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleOAuthTokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => GoogleOAuthTokenClient;
        };
      };
      /** Loaded via gapi.load('picker'). The builder API is used loosely-typed
       * on purpose — typing the whole Picker namespace is churn with no safety
       * payoff for the handful of chained calls we make. */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      picker?: any;
    };
  }
}
