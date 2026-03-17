FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# build Angular
RUN npm run build -- --configuration production

# cài serve để chạy static
RUN npm install -g serve

# Railway cần PORT
ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "serve -s dist/webrtc-angular/browser -l $PORT"]