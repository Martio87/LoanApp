import { ref, type Ref } from 'vue';
import { appConfig } from '@/config/appConfig';

export type Device = {
  id: string;
  name: string;
  pricePence?: number;
  model?: string;
  description?: string;
};

const API_BASE = appConfig.apiBaseUrl;

export function useDevices() {
  const devices: Ref<Device[]> = ref([]);
  const loading = ref(false);
  const error: Ref<string | null> = ref(null);

  const fetchDevices = async (force = false) => {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      // Try several candidate endpoints so the frontend can work with
      // different backend route configurations (e.g. /api/devices vs /devices
      // or legacy /products).
      const tried: string[] = [];
      const results: string[] = [];

      const candidates = (() => {
        const list: string[] = [];
        const primary = new URL('device', API_BASE).toString();
        list.push(primary);
        // If API_BASE ends with /api/ try a variant without the /api/ prefix
        const baseNoApi = API_BASE.replace(/\/api\/?$/i, '/');
        if (baseNoApi !== API_BASE) {
          list.push(new URL('device', baseNoApi).toString());
        }
        // Also try legacy 'products' endpoints in case backend still exposes those
        list.push(new URL('products', API_BASE).toString());
        if (baseNoApi !== API_BASE) {
          list.push(new URL('products', baseNoApi).toString());
        }
        return Array.from(new Set(list));
      })();

      let success = false;
      for (const url of candidates) {
        tried.push(url);
        try {
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
          });
          results.push(`${url} -> ${res.status} ${res.statusText}`);
          if (!res.ok) {
            // try next candidate
            continue;
          }
          const data = await res.json();
          // Handle both direct array responses and wrapped responses like { devices: [...] } or { data: [...] }
          const deviceArray = Array.isArray(data)
            ? data
            : (data.devices ?? data.data ?? data.items ?? []);
          devices.value = Array.isArray(deviceArray) ? deviceArray : [];
          success = true;
          break;
        } catch (innerErr) {
          const msg =
            innerErr instanceof Error ? innerErr.message : String(innerErr);
          results.push(`${url} -> error: ${msg}`);
          // try next candidate
          continue;
        }
      }

      if (!success) {
        throw new Error(`All endpoints failed:\n${results.join('\n')}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      error.value = `Failed to load devices. Attempts:\n${msg}`;
    } finally {
      loading.value = false;
    }
  };

  return { devices, loading, error, fetchDevices };
}
