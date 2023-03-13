# Blueprintnotincluded

This is the source repo of blueprintnotincluded.org

It is a combined curated version of the original blueprintnotincluded web app.

## Easy local testing w/ docker-compose

`docker-compose up`

Visit http://localhost:3000

## Docker image building

Build the image

`docker build . -t bpni:latest`

Run mongodb (mongoose version only allows mongo version 4.2)

`docker run -d -p 27017:27017 mongo:4.2`

Run the image and backend

`docker run -d -p 3000:3000 -e JWT_SECRET=mysecretkey -e ENV_NAME=development -e CAPTCHA_SITE=localhost -e CAPTCHA_SECRET=mysecretkey -e DB_URI="mongodb://127.0.0.1:27017/blueprintnotincluded" bpni:latest`

Visit http://localhost:3000