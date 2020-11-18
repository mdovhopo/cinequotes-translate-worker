FROM node:12

WORKDIR /var/www/app

COPY . .
RUN npm install
RUN npm run build

CMD ["npm", "start"]
