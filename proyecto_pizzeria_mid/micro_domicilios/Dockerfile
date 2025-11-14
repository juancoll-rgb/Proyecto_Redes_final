FROM node:18-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY app/ .

EXPOSE 3004

CMD ["node", "index.js"]

