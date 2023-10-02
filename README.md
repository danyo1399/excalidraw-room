# Self hosted excalidraw server
Its still in a proof of concept

This is a self-contained self hosted fork of excalidraw that you can 
self-host in your own environment

##Rrun via docker example

Build docker container with the 
```
docker buildx build --platform linux/amd64 -t danyo1399/excalidraw-selfhosted:latest .

```
Host docker container
```
docker run -p 3333:80 -it --rm --name excalidraw-selfhosted danyo1399/excalidraw-selfhosted:latest


```

goto `http://localhost:3333`

## Build and publish new version
- open exalidraw repo and run yarn build
- delete contents of excalidraw folder
- copy latest version to from build to excalidraw folder in this repo
- run cmd above to build container
- publish container to `docker push danyo1399/excalidraw-selfhosted:latest`

hosted in vm
```
sudo docker pull danyo1399/excalidraw-selfhosted:latest
sudo docker run -p 80:80 -p:443:443 -p:3002:80 --env-file excalidraw.env -itd --restart unless-stopped -v $PWD:/data --name excalidraw-selfhosted danyo1399/excalidraw-selfhosted:latest
```
### Below are the excalidraw docs

---
# Example of excalidraw collaboration server

Collaboration server for Excalidraw

If you need to use cluster mode with pm2. Checkout: https://socket.io/docs/v4/pm2/

If you are not familiar with pm2: https://pm2.keymetrics.io/docs/usage/quick-start/

# Development

- install

  ```sh
  yarn
  ```

- run development server

  ```sh
  yarn start:dev
  ```

# Start with pm2

```
pm2 start pm2.production.json
```
