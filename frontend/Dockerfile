FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN chmod -R +x node_modules/.bin/

EXPOSE 5173
CMD ["npx", "vite", "--host", "--port", "5173"]
