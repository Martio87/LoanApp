<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useDevices } from '@/composables/useDevices';

const { devices, loading, error, fetchDevices, reserving, reserveDevice } =
  useDevices();
import { useAuth0 } from '@auth0/auth0-vue';
const { isAuthenticated, loginWithRedirect } = useAuth0();

onMounted(() => {
  fetchDevices();
});

watch(isAuthenticated, () => {
  // Re-fetch when auth state changes to reflect public vs private data.
  fetchDevices(true);
});
</script>

<template>
  <div class="devices-view">
    <h1>Devices</h1>

    <div v-if="loading" class="loading">Loading devices…</div>
    <div v-else-if="error" class="error">
      <p>Error: {{ error }}</p>
      <button @click="fetchDevices(true)">Retry</button>
    </div>
    <div v-else-if="devices.length === 0" class="empty">No devices found.</div>

    <ul v-else class="list">
      <li v-for="d in devices" :key="d.id" class="card">
        <!-- Guest view: just make and model -->
        <template v-if="!isAuthenticated">
          <div class="row">
            <span class="make">{{ d.manufacturer }}</span>
            <span class="model">{{ d.model }}</span>
          </div>
        </template>
        <!-- Authenticated view: availability and stock -->
        <template v-else>
          <div class="row">
            <strong class="model-name">{{ d.model }}</strong>
            <span
              class="availability"
              :class="{
                available: d.availability === 'available' || !d.availability,
                'on-loan': d.availability === 'on-loan',
                maintenance: d.availability === 'maintenance',
              }"
            >
              {{
                d.availability === 'on-loan'
                  ? 'On Loan'
                  : d.availability === 'maintenance'
                    ? 'Maintenance'
                    : 'Available'
              }}
            </span>
          </div>
          <div class="stock-row">
            <span class="manufacturer">{{ d.manufacturer }}</span>
            <span class="stock">In Stock: {{ d.stockCount ?? 1 }}</span>
            <button
              class="reserve-btn"
              :disabled="
                (d.availability ?? '') === 'on-loan' ||
                (d.availability ?? '') === 'maintenance' ||
                reserving[d.id]
              "
              @click="
                isAuthenticated ? reserveDevice(d.id) : loginWithRedirect()
              "
            >
              <span v-if="!isAuthenticated">Sign in to Reserve</span>
              <span v-else-if="reserving[d.id]">Reserving…</span>
              <span v-else>Reserve</span>
            </button>
          </div>
        </template>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.devices-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
}
.list {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: white;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}
.make {
  font-weight: 600;
  color: #1f2937;
}
.model {
  color: #6b7280;
}
.model-name {
  font-weight: 600;
  color: #1f2937;
}
.availability {
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.available {
  background: #d1fae5;
  color: #065f46;
}
.unavailable {
  background: #fee2e2;
  color: #991b1b;
}
.stock-row {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}
.manufacturer {
  color: #6b7280;
}
.stock {
  font-size: 0.85rem;
  color: #4b5563;
}
.loading,
.error,
.empty {
  text-align: center;
  padding: 2rem;
}
.error button {
  margin-top: 0.5rem;
}
</style>
