mkdir -p build/app/public
if [ $(command -v rsync) ]
then
  rsync -amv frontend/dist/blueprintnotincluded/ build/app/public
else
  (cd frontend/dist/blueprintnotincluded && cp -r --parents . ../../../build/app/public)
fi
