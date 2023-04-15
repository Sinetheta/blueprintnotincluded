mkdir -p build/lib
if [ $(command -v rsync) ]
then
  rsync -zarv --prune-empty-dirs --include '*/' --include='*.ejs' --exclude='*' 'app' 'build'
else
  cp --parents $(find app -name '*.ejs') build
fi
