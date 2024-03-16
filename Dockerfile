FROM node:20-bullseye-slim

WORKDIR /app
ADD . /app

RUN apt-get update && apt-get install -y build-essential gcc libvips libssl1.1 python3

RUN npm install

RUN apt-get clean && apt-get purge -y build-essential gcc python3 npm && apt autoremove -y
CMD [ "index.js" ]
