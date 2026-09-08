FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# try_files para las rutas del router de Angular; sin esto, volver del login
# de Microsoft a /dashboard daria 404.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend-agrotrack/browser /usr/share/nginx/html
EXPOSE 80
