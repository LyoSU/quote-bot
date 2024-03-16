FROM node:16-alpine

WORKDIR /app
ADD . /app

RUN apk add python3 build-base libssl1.1 gcompat
RUN npm install

CMD [ "index.js" ]