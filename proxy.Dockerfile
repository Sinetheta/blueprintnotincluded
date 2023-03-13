# Stage 1: Compile and Build angular codebase

# Use official node image as the base image
FROM node:16 as build

# Set the working directory
WORKDIR /app

# Add the source code to app
COPY ./frontend /app/bpni
COPY ./lib /app/lib

# Generate the lib packages
WORKDIR /app/lib
RUN npm install --legacy-deps

WORKDIR /app/bpni

# Install all the backend dependencies
RUN npm install --legacy-deps

# Generate the build of the application
RUN npm run build

# Stage 3: Serve app with nginx server

# Use official nginx image as the base image
FROM nginx:latest

# Copy the build output to replace the default nginx contents.
COPY --from=build /app/bpni/dist/blueprintnotincluded /usr/share/nginx/html

# Expose port 80
EXPOSE 80
