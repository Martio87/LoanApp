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
  const reserving: Ref<Record<string, boolean>> = ref({});

  const fetchDevices = async (force = false) => {
    if (loading.value && !force) return;
    loading.value = true;
    error.value = null;
    let url: string | undefined;
    try {
      // Build the API URL (try plural endpoint first, then fall back)
      const base = API_BASE.replace(/\/$/, '');
      const pluralUrl = `${base}/device`;
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
      // endpoint for backward compatibility. If both fail and the app was
      // built with a relative `/api/` base (common for static site + remote
      // API setups), attempt to fall back to the configured Auth0 audience
      // when that audience is a full URL (many projects set the audience to
      // the API's base URL). This avoids a 404 from the static site's own
      // `/api/` path when the actual API lives on a different host.
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

      // If both plural/singular returned 404 and we have an auth audience
      // that looks like an absolute URL, try that as a fallback API base.
      if (!res.ok && res.status === 404) {
        const audience = appConfig.auth0?.audience;
        if (
          audience &&
          typeof audience === 'string' &&
          /^https?:\/\//i.test(audience)
        ) {
          const audBase = audience.replace(/\/$/, '');
          const audUrl = `${audBase}/devices`;
          // eslint-disable-next-line no-console
          console.debug(
            '[useDevices] trying auth0 audience URL fallback:',
            audUrl,
          );
          url = audUrl;
          res = await fetch(url, { headers });
          if (!res.ok && res.status === 404) {
            // try singular at audience base
            const audSingular = `${audBase}/device`;
            // eslint-disable-next-line no-console
            console.debug(
              '[useDevices] audience singular fallback:',
              audSingular,
            );
            url = audSingular;
            res = await fetch(url, { headers });
          }
        }
      }

      if (!res.ok) {
        // Try to include any response text to make the error actionable.
        let bodyText = '';
        try {
          bodyText = await res.text();
        } catch {
          // ignore
        }
        const statusMsg = `${res.status} ${res.statusText}`.trim();
        throw new Error(bodyText ? `${statusMsg}: ${bodyText}` : statusMsg);
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

  const reserveDevice = async (id: string) => {
    // Assumptions: the API exposes a POST /devices/:id/reserve or
    // POST /device/:id/reserve endpoint. We'll try plural then singular,
    // and fall back to the Auth0 audience host if needed (similar to fetch).
    if (reserving.value[id]) return false;
    reserving.value = { ...reserving.value, [id]: true };
    let url: string | undefined;
    try {
      const base = API_BASE.replace(/\/$/, '');
      const tryUrls = [
        `${base}/devices/${id}/reserve`,
        `${base}/device/${id}/reserve`,
      ];

      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
      if (isAuthenticated.value) {
        try {
          const token = await getAccessTokenSilently();
          if (token) headers.Authorization = `Bearer ${token}`;
        } catch {
          // proceed without token
        }
      }

      let res: Response | null = null;
      for (const u of tryUrls) {
        url = u;
        // eslint-disable-next-line no-console
        console.debug('[useDevices] reserve attempt url=', url);
        res = await fetch(url, { method: 'POST', headers });
        if (res.ok || res.status !== 404) break; // stop if not a 404 (either success or real error)
      }

      // fallback to audience base if 404
      if (res && res.status === 404) {
        const audience = appConfig.auth0?.audience;
        if (
          audience &&
          typeof audience === 'string' &&
          /^https?:\/\//i.test(audience)
        ) {
          const audBase = audience.replace(/\/$/, '');
          const audTry = [
            `${audBase}/devices/${id}/reserve`,
            `${audBase}/device/${id}/reserve`,
          ];
          for (const u of audTry) {
            url = u;
            // eslint-disable-next-line no-console
            console.debug('[useDevices] reserve audience attempt url=', url);
            res = await fetch(url, { method: 'POST', headers });
            if (res.ok || res.status !== 404) break;
          }
        }
      }

      // If we still have a 404, try endpoints that accept the id in the
      // request body (common pattern: POST /devices/reserve { id }). This
      // increases compatibility with different backend shapes.
      if (res && res.status === 404) {
        const bodyPayload = JSON.stringify({ id });
        const tryBodyUrls = [
          `${base}/devices/reserve`,
          `${base}/device/reserve`,
          `${base}/reserve`,
        ];
        for (const u of tryBodyUrls) {
          url = u;
          // eslint-disable-next-line no-console
          console.debug(
            '[useDevices] reserve attempt (body) url=',
            url,
            'payload=',
            bodyPayload,
          );
          res = await fetch(url, {
            method: 'POST',
            headers,
            body: bodyPayload,
          });
          if (res.ok || res.status !== 404) break;
        }

        if (res && res.status === 404) {
          const audience = appConfig.auth0?.audience;
          if (
            audience &&
            typeof audience === 'string' &&
            /^https?:\/\//i.test(audience)
          ) {
            const audBase = audience.replace(/\/$/, '');
            const audBodyUrls = [
              `${audBase}/devices/reserve`,
              `${audBase}/device/reserve`,
              `${audBase}/reserve`,
            ];
            for (const u of audBodyUrls) {
              url = u;
              // eslint-disable-next-line no-console
              console.debug(
                '[useDevices] reserve audience attempt (body) url=',
                url,
                'payload=',
                bodyPayload,
              );
              res = await fetch(url, {
                method: 'POST',
                headers,
                body: bodyPayload,
              });
              if (res.ok || res.status !== 404) break;
            }
          }
        }
      }

      if (!res) throw new Error('No response from server');
      if (!res.ok) {
        let body = '';
        try {
          body = await res.text();
        } catch {}
        throw new Error(body || `${res.status} ${res.statusText}`);
      }

      // On success remove the reserved device from the local list so it
      // doesn't overlap with other reservations in the UI.
      devices.value = devices.value.filter((d) => d.id !== id);

      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useDevices] reserve failed', e, 'url=', url);
      return false;
    } finally {
      reserving.value = { ...reserving.value, [id]: false };
    }
  };

  return { devices, loading, error, fetchDevices, reserving, reserveDevice };
}
