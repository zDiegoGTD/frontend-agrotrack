FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
# --ignore-scripts: ningun paquete ejecuta scripts al instalarse (cadena de suministro).
# El build de Angular no los necesita: esbuild trae su binario como dependencia opcional.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# nginx sin privilegios: corre como el usuario "nginx" (no root) y escucha en 8080.
# compose publica el 80 del host hacia este 8080, asi el API Gateway no cambia.
FROM nginxinc/nginx-unprivileged:alpine
# try_files para las rutas del router de Angular; sin esto, volver del login
# de Microsoft a /dashboard daria 404.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend-agrotrack/browser /usr/share/nginx/html
EXPOSE 8080
