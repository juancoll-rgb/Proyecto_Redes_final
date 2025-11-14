FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY app/ .

ENV PORT=3002

EXPOSE 3002

CMD ["node", "index.js"]

