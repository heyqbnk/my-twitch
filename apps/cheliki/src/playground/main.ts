import { createApp } from 'vue';
import '../style.css';
import { DOLL_64 } from '../doll/doll64';
import PlaygroundApp from './PlaygroundApp.vue';

createApp(PlaygroundApp, { doll: DOLL_64 }).mount('#app');
