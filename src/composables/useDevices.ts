import { ref, type Ref } from 'vue';
import { appConfig } from '@/config/appConfig';

export type Device = {
  id: string;
  name: string;
  pricePence?: number;
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
      const url = new URL('devices', API_BASE).toString();
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok)
        throw new Error(
          `Failed to fetch devices: ${res.status} ${res.statusText}`,
        );
      const data: Device[] = await res.json();
      devices.value = Array.isArray(data) ? data : [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  };

  return { devices, loading, error, fetchDevices };
}
