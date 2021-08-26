require('babel-register');

if (process.env.MODE === 'deploy-test') {
    require('./deploy-commands');
}
else if (process.env.MODE === 'deploy-global') {
    require('./deploy-commands-global');
}
else {
    const Server = require('./src/server');

    Server.startServer();
}
