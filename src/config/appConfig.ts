export interface AppConfig {
  apiBaseUrl: string;
  auth0: {
    domain: string;
    clientId: string;
    audience?: string;
  };
}

export function loadAppConfig(): AppConfig {
  // Prefer a relative '/api/' during local dev so Vite's dev-server proxy can
  // forward requests to the function host and avoid CORS/mixed-content issues.
  // Users can still explicitly set a full URL via VITE_API_BASE_URL when needed.
  let apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string) ?? '/api/';

  console.debug('[appConfig] Loaded VITE_API_BASE_URL=', apiBaseUrl);

  // If a developer accidentally left a local http://localhost URL in the
  // environment but the app is running on a non-localhost origin (for
  // example an HTTPS preview site), that will cause "Failed to fetch"
  // / mixed-content errors. In that case prefer the relative '/api/' which
  // will allow the dev server proxy to be used or a deployment to provide
  // the proper remote URL via CI/CD.
  try {
    if (
      typeof window !== 'undefined' &&
      apiBaseUrl?.startsWith('http://localhost') &&
      window.location.hostname !== 'localhost'
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[appConfig] Overriding VITE_API_BASE_URL=${apiBaseUrl} -> '/api/' because the app is not served from localhost`,
      );
      apiBaseUrl = '/api/';
    }
  } catch {
    // ignore any window access errors in non-browser contexts
  }
  const domain = (import.meta.env.VITE_AUTH0_DOMAIN as string) ?? '';
  const clientId = (import.meta.env.VITE_AUTH0_CLIENT_ID as string) ?? '';
  const audience =
    (import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined) || undefined;

  return {
    apiBaseUrl,
    auth0: { domain, clientId, audience },
  };
}

export const appConfig = loadAppConfig();

export function buildAuth0Options(cfg: AppConfig) {
  return {
    domain: cfg.auth0.domain,
    clientId: cfg.auth0.clientId,
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: cfg.auth0.audience,
      scope: 'openid profile email',
    },
    cacheLocation: 'localstorage' as const,
    useRefreshTokens: false,
  };
}
