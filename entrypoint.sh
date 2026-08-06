#!/bin/sh
set -e

cd /app/apps/web
node migrate.js

cd /app
exec node server.js
