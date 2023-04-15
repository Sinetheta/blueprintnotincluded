FROM --platform=amd64 node:14 as build

WORKDIR /bpni

# TODO separate build build stage for asset extract
COPY ./assets ./assets

# Install backend deps (changes least frequently)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Install frontend deps
COPY ./frontend/package*.json ./frontend/
WORKDIR /bpni/frontend
RUN npm ci --ignore-scripts

# Build backend
WORKDIR /bpni
COPY ./lib ./lib
RUN npm run build:lib
COPY ./scripts/copy_lib.sh ./scripts/
RUN ./scripts/copy_lib.sh
COPY ./tsconfig.json ./
COPY ./app ./app
COPY ./scripts/copy_views.sh ./scripts/
RUN ./scripts/copy_views.sh
COPY ./scripts/copy_public.sh ./scripts/
RUN ./scripts/copy_public.sh
RUN npm run build:backend

# Build frontend
COPY ./frontend ./frontend
RUN npm run build:frontend
COPY ./scripts/copy_frontend.sh ./scripts/
RUN ./scripts/copy_frontend.sh

EXPOSE 3000
CMD [ "node", "build/app/server.js" ]
