<script setup lang="ts">
import { ref } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';

const { isAuthenticated, loginWithRedirect, logout, user, isLoading } =
  useAuth0();
const returnTo = window.location.origin;

// Track if user chose to continue as guest
const isGuest = ref(false);

// Show content only if authenticated OR guest
const showContent = () => isAuthenticated.value || isGuest.value;

const handleGuest = () => {
  isGuest.value = true;
};

const handleLogin = async () => {
  try {
    console.log('Starting login...');
    await loginWithRedirect();
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed: ' + error);
  }
};
</script>
<template>
  <div class="app">
    <!-- Landing page when not authenticated and not guest -->
    <div v-if="!isLoading && !showContent()" class="landing">
      <div class="landing-content">
        <h1>Loan App</h1>
        <p>Manage your devices and loans</p>
        <div class="landing-buttons">
          <button class="btn-primary" @click="handleLogin">Sign in</button>
          <button class="btn-secondary" @click="handleGuest">
            Continue as Guest
          </button>
        </div>
      </div>
    </div>

    <!-- Main app when authenticated or guest -->
    <template v-else-if="showContent()">
      <header class="topbar">
        <div class="brand">Loan App</div>
        <div class="spacer"></div>
        <div class="auth">
          <span v-if="isAuthenticated && user" class="user">
            Signed in as {{ user.name || user.email }}
          </span>
          <button
            v-if="isAuthenticated"
            @click="logout({ logoutParams: { returnTo } })"
          >
            Sign out
          </button>
          <template v-else>
            <button @click="loginWithRedirect()">Sign in</button>
          </template>
        </div>
      </header>
      <main class="content">
        <RouterView />
      </main>
    </template>

    <!-- Loading state -->
    <div v-else class="loading">Loading...</div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #f5f5f5;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #111827; /* gray-900 */
  color: #e5e7eb; /* gray-200 */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
.brand {
  font-weight: 600;
  color: #e5e7eb;
  text-decoration: none;
}
.brand:hover {
  color: white;
}
.spacer {
  flex: 1;
}
.auth {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.auth button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
}
.auth button:hover {
  background: #1d4ed8;
}
.guest-btn {
  background: transparent;
  border: 1px solid #e5e7eb;
}
.guest-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.user {
  margin-right: 0.5rem;
  font-size: 0.9rem;
  opacity: 0.9;
}
.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}
.landing {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a5f 0%, #111827 100%);
}
.landing-content {
  text-align: center;
  color: white;
}
.landing-content h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
.landing-content p {
  font-size: 1.25rem;
  opacity: 0.8;
  margin-bottom: 2rem;
}
.landing-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}
.btn-primary,
.btn-secondary {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  min-width: 200px;
}
.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}
.loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
