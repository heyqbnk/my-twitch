import { createApp } from 'vue';

import '../style.css';
import PlaygroundApp from './PlaygroundApp.vue';
import { DOLL_64 } from '../doll/doll64';

createApp(PlaygroundApp, { doll: DOLL_64 }).mount('#app');
