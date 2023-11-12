# Cannot use alpine because we need a distro that uses glibgc instead of musl for node-canvas
# eg: https://github.com/nodejs/build/issues/1140
# canvas prebuilds to target https://github.com/Automattic/node-canvas/releases
FROM --platform=amd64 node:18-slim

RUN npm install -g npm@10.2.0

# Add the source code to app
COPY ./ /app/bpni

# Generate the lib packages
WORKDIR /app/bpni/lib
RUN npm ci --verbose

# build the frontend
WORKDIR /app/bpni/frontend
RUN npm ci --verbose
ENV NG_CLI_ANALYTICS=false
RUN npm run build

# build the backend
WORKDIR /app/bpni
RUN npm ci --verbose
RUN npm run tsc

# # Copy over frontend
# COPY /app/bpni/frontend/dist/blueprintnotincluded /app/bpni/app/public

# # Expose port 3000
# EXPOSE 3000

# #RUN npm run dev
# ENTRYPOINT npm run dev
