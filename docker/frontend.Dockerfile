# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
ARG FRONTEND_DIR=web
WORKDIR /app
COPY ${FRONTEND_DIR}/package.json ${FRONTEND_DIR}/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY ${FRONTEND_DIR}/ ./
RUN npm run build

FROM nginx:1.28-alpine AS web
COPY docker/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/proxy.conf /etc/nginx/mossline-proxy.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 80

FROM nginx:1.28-alpine AS admin
COPY docker/nginx/admin.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/admin/
EXPOSE 80
