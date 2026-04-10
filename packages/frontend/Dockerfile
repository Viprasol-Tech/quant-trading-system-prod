FROM alpine:latest

RUN apk add --no-cache nginx

WORKDIR /app
COPY dist /usr/share/nginx/html

RUN mkdir -p /etc/nginx/conf.d && \
    cat > /etc/nginx/nginx.conf << 'CONF'
user nginx;
worker_processes auto;
daemon off;
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
  types_hash_max_size 2048;

  server {
    listen 6205;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
      try_files $uri $uri/ /index.html;
    }

    location /api/ {
      proxy_pass http://backend:6005;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
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
CMD ["/usr/sbin/nginx"]
