import { createApp } from 'vue';
import { createAuth0 } from '@auth0/auth0-vue';
import { appConfig, buildAuth0Options } from './config/appConfig';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(createAuth0(buildAuth0Options(appConfig)));

// Optionally provide the config to the app for injection where needed
app.provide('appConfig', appConfig);

app.use(router);

app.mount('#app');
