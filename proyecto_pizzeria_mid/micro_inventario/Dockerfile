FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY app/ .

ENV PORT=3001

EXPOSE 3001

CMD ["node", "index.js"]

