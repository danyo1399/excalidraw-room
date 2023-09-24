FROM node:18-alpine

WORKDIR /excalidraw-room
ENV ENV_BASE_PATH=/excalidraw-room/dist
COPY package.json yarn.lock ./
RUN yarn

COPY tsconfig.json ./
COPY src ./src
COPY excalidraw ./excalidraw
RUN yarn build
COPY excalidraw ./dist/excalidraw
EXPOSE 80
# CMD ["/bin/sh"]

CMD ["yarn", "start"]
