FROM node:18-alpine

WORKDIR /excalidraw-room
ENV ENV_BASE_PATH=/
COPY package.json yarn.lock ./
RUN yarn

COPY tsconfig.json ./
COPY src ./src
RUN yarn build
COPY excalidraw /excalidraw
EXPOSE 80
# CMD ["/bin/sh"]

CMD ["yarn", "start"]
