mkdir -p build/app/public
if [ $(command -v rsync) ]
then
  rsync -amv app/public/ build/app/public
else
  cp -r --parents app/public/* build
fi
