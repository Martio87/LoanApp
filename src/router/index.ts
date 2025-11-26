import { createRouter, createWebHistory } from 'vue-router';
import Devices from '@/views/Devices.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', name: 'devices', component: Devices }],
});

export default router;
