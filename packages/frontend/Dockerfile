FROM nginx:latest

WORKDIR /app
COPY dist /usr/share/nginx/html

RUN rm -f /etc/nginx/conf.d/default.conf && \
    rm -rf /docker-entrypoint.d/* && \
    cat > /etc/nginx/nginx.conf << 'CONF'
user nginx;
worker_processes auto;
pid /var/run/nginx.pid;
error_log /var/log/nginx/error.log warn;

events { worker_connections 1024; }

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  access_log /var/log/nginx/access.log;
  sendfile on;
  tcp_nopush on;
  tcp_nodelay on;
  keepalive_timeout 65;

  server {
    listen 6205;
    root /usr/share/nginx/html;
    index index.html;

    location / {
      try_files $uri $uri/ /index.html;
    }

    location /api/ {
      proxy_pass http://backend:6005;
      proxy_set_header Host $host;
    }

    location /ws {
      proxy_pass http://backend:6005;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_read_timeout 86400;
    }
  }
}
CONF

EXPOSE 6205
CMD ["nginx", "-g", "daemon off;"]
