#Update Deployment On AWS Box
echo "Preparing to update deployment"
pm2 stop gw2-rba
npm run clean

echo "Fetch the latest changes from master"
git stash && git fetch && git pull && git stash pop

echo "Installing our node modules"
npm install

echo "Restarting the PM2 service"
pm2 start gw2-rba
