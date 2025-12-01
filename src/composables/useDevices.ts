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
    try {
      // Build the API URL
      const url = `${API_BASE.replace(/\/$/, '')}/device`;

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

      const res = await fetch(url, { headers });
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
      error.value = `Failed to load devices: ${msg}`;
    } finally {
      loading.value = false;
    }
  };

  return { devices, loading, error, fetchDevices };
}
