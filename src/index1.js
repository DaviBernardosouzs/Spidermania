import 'dotenv/config';

import {
    iniciarWebhook
} from './integrations/evolution/evolution.webhook.js';


console.log(
    '🕷 Iniciando PeterPark com Evolution API...'
);


iniciarWebhook();