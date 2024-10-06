FROM nikolaik/python-nodejs:python3.11-nodejs20 AS builder

ENV NODE_WORKDIR /app
WORKDIR $NODE_WORKDIR

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN apt-get update && apt-get install -y build-essential gcc wget git libvips && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install && npm install sharp@0.30.5 && npm install tdl-tdlib-addon --build-from-source

ADD . $NODE_WORKDIR