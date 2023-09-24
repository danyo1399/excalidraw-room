# Self hosted excalidraw server
Its still in a proof of concept

This is a self-contained self hosted fork of excalidraw that you can 
self-host in your own environment

##Rrun via docker example

Build docker container with the 
```
docker buildx build -t excalidraw-selfhosted:latest .
```
Host docker container
```
docker run -p 3333:80 -itd --name excalidraw-selfhosted excalidraw-selfhosted:latest 
```
goto `http://localhost:3333`

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
