import { createApp } from 'vue';
import '../style.css';
import { DOLL_64 } from '../doll/doll64';
import CrowdApp from './CrowdApp.vue';

createApp(CrowdApp, { doll: DOLL_64 }).mount('#app');
