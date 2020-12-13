FROM node:14

WORKDIR /app

ADD package.json .
RUN npm install

ADD . .

ENV PORT=80
EXPOSE 80

CMD npm start
