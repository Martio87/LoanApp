import { ref, type Ref } from 'vue';
import { appConfig } from '@/config/appConfig';
import { useAuth0 } from '@auth0/auth0-vue';

export type Device = {
  id: string;
  name: string;
  model?: string;
  manufacturer?: string;
  description?: string;
  availability?: 'available' | 'on-loan' | 'maintenance';
  stockCount?: number;
};

const API_BASE = appConfig.apiBaseUrl;

export function useDevices() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const devices: Ref<Device[]> = ref([]);
  const loading = ref(false);
  const error: Ref<string | null> = ref(null);

  const fetchDevices = async (force = false) => {
    if (loading.value && !force) return;
    loading.value = true;
    error.value = null;
    let url: string | undefined;
    try {
      // Build the API URL (try plural endpoint first, then fall back)
      const base = API_BASE.replace(/\/$/, '');
      const pluralUrl = `${base}/devices`;
      const singularUrl = `${base}/device`;
      url = pluralUrl;

      // Diagnostic log: show which API base and URL we're calling so it's
      // easier to debug 'Failed to fetch' errors in the browser console.
      // Keep this at debug level so it can be removed or filtered easily.
      // eslint-disable-next-line no-console
      console.debug('[useDevices] API_BASE=', API_BASE, ' -> url=', url);

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (isAuthenticated.value) {
        try {
          const token = await getAccessTokenSilently();
          if (token) headers.Authorization = `Bearer ${token}`;
        } catch {
          // If token retrieval fails, proceed unauthenticated
        }
      }

      // Try plural endpoint first. If it returns 404, try the older singular
      // endpoint for backward compatibility.
      let res = await fetch(url, { headers });
      if (!res.ok && res.status === 404) {
        // eslint-disable-next-line no-console
        console.debug(
          '[useDevices] plural endpoint 404, trying singular:',
          singularUrl,
        );
        url = singularUrl;
        res = await fetch(url, { headers });
      }
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      // Handle both direct array responses and wrapped responses like { data: [...] }
      const deviceArray = Array.isArray(data)
        ? data
        : (data.devices ?? data.data ?? data.items ?? []);
      devices.value = Array.isArray(deviceArray) ? deviceArray : [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      // Provide a slightly more actionable error when it's the generic
      // `Failed to fetch` browser network error which commonly indicates
      // mixed-content (HTTPS page calling HTTP), CORS/network or DNS issues.
      let hint = '';
      try {
        const attempted = new URL(url ?? '', window.location.href);
        if (msg === 'Failed to fetch') {
          if (attempted.protocol !== window.location.protocol) {
            hint =
              ' (possible mixed-content: page is ' +
              window.location.protocol +
              ' but API is ' +
              attempted.protocol +
              ')';
          } else if (
            attempted.hostname === 'localhost' &&
            window.location.hostname !== 'localhost'
          ) {
            hint =
              ' (attempting to contact localhost from a remote browser — backend may be unreachable)';
          } else {
            hint = ' (network/CORS/misconfigured URL)';
          }
        }
      } catch {
        // ignore URL parse errors
      }

      error.value = `Failed to load devices: ${msg}${hint}`;
    } finally {
      loading.value = false;
    }
  };

  return { devices, loading, error, fetchDevices };
}
