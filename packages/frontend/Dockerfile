FROM nginx:alpine

WORKDIR /app
COPY dist /usr/share/nginx/html
COPY ../../../nginx.conf /etc/nginx/nginx.conf

EXPOSE 6205

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:6205/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
