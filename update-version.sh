#!/bin/bash

VERSION=$(cat package.json | grep version | grep -Eo "[0-9]+\.[0-9]+\.[0-9]+")
sed -i '' "s/^Version.*$/Version $VERSION/" README.md
sed -i '' "s/version: ".*",$/version: \"$VERSION\",/" streaming-dot.js 
npm run build
git add README.md streaming-dot.js streaming-dot.min.js
