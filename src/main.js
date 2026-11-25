import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
window.L = L;

import '../src/css/design-system.css';
import '../src/css/layout.css';
import '../src/css/components.css';
import '../src/css/chat.css';
import '../src/css/features.css';
import '../src/css/misc.css';

import '../js/features/recruitment.js';

import { App } from '../js/core/app.js';

document.addEventListener('DOMContentLoaded', () => {
    App.boot();
});
