FROM nikolaik/python-nodejs:python3.12-nodejs21-bullseye AS builder

ENV NODE_WORKDIR /app
WORKDIR $NODE_WORKDIR

ADD . $NODE_WORKDIR

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN apt-get update && apt-get install -y build-essential gcc wget git libvips libssl1.1 && rm -rf /var/lib/apt/lists/*

RUN npm install
