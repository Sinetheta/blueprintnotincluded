FROM --platform=amd64 node:16 as build-frontend

# Set the working directory
WORKDIR /app

# Add the source code to app
COPY ./frontend /app/bpni
COPY ./lib /app/lib

# Generate the lib packages
WORKDIR /app/lib
RUN npm install

WORKDIR /app/bpni

# Install all the backend dependencies
RUN npm install

# Generate the build of the application
RUN npm run build

# Copy the build output to replace the default nginx contents.

# Stage 1: Compile and Build angular codebase

# Use official node image as the base image
FROM --platform=amd64 node:14 as build

# Set the working directory
WORKDIR /app

# Add the source code to app
COPY ./ /app/bpni

# Set the new working dir
WORKDIR /app/bpni

# Generate the lib packages
WORKDIR /app/bpni/lib
RUN npm install

# Install all the backend dependencies
WORKDIR /app/bpni
RUN npm install

# Generate the build of the application
RUN npm run tsc

# Copy over frontend
COPY --from=build-frontend /app/bpni/dist/blueprintnotincluded /app/bpni/app/public

# Expose port 3000
EXPOSE 3000

#RUN npm run dev
ENTRYPOINT npm run dev

ENV EMAIL_USER=your-gmail@gmail.com
ENV EMAIL_PASS=your-16-char-app-password
ENV SITE_URL=http://localhost:3000
ENV SMTP_HOST=localhost
ENV SMTP_PORT=25
ENV SMTP_USER=
ENV SMTP_PASS=
ENV SMTP_FROM=noreply@blueprintnotincluded.com
