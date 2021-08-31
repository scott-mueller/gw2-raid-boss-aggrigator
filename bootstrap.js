/*require('@babel/core').transform('code', {
    presets: ['@babel/preset-env']
});*/

import './env.js';
import deployGlobal from './deploy-commands-global';
import deployLocal from './deploy-commands';
import { startServer } from './src/server';




if (process.env.MODE === 'deploy-test') {
    deployLocal();
}
else if (process.env.MODE === 'deploy-global') {
    deployGlobal();
}
else {
    startServer();
}
