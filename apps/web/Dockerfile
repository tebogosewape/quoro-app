# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV CHOKIDAR_USEPOLLING=true \
	CHOKIDAR_INTERVAL=300 \
	WATCHPACK_POLLING=true \
	WATCHPACK_POLLING_INTERVAL=300

EXPOSE 2100

CMD ["npm", "run", "dev"]
