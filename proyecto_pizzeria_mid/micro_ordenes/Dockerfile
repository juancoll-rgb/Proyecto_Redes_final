FROM node:18-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY app/ .
EXPOSE 3003
CMD ["node", "index.js"]

