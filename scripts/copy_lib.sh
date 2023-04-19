mkdir -p build/lib
if [ $(command -v rsync) ]
then
  rsync -amv --include='*.js' --include='*/' --exclude='*' lib/ build/lib
else
  cp -r --parents $(find lib -name '*.js') build
fi
