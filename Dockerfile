FROM node:alpine

WORKDIR /app
ADD . /app

RUN apk add --no-cache python3 make g++

RUN npm install

RUN apk del python3 make g++

CMD [ "index.js" ]
