FROM alpine:latest

RUN apk add --no-cache nginx

WORKDIR /app
COPY dist /usr/share/nginx/html

RUN printf 'user nginx;\nworker_processes auto;\ndaemon off;\npid /var/run/nginx.pid;\nerror_log /var/log/nginx/error.log warn;\n\nevents {\n  worker_connections 1024;\n}\n\nhttp {\n  include /etc/nginx/mime.types;\n  default_type application/octet-stream;\n  access_log /var/log/nginx/access.log;\n  sendfile on;\n  tcp_nopush on;\n  tcp_nodelay on;\n  keepalive_timeout 65;\n  types_hash_max_size 2048;\n\n  server {\n    listen 6205;\n    server_name _;\n    root /usr/share/nginx/html;\n    index index.html;\n\n    location / {\n      try_files $uri $uri/ /index.html;\n    }\n\n    location /api/ {\n      proxy_pass http://backend:6005;\n      proxy_set_header Host $host;\n      proxy_set_header X-Real-IP $remote_addr;\n    }\n\n    location /ws {\n      proxy_pass http://backend:6005;\n      proxy_http_version 1.1;\n      proxy_set_header Upgrade $http_upgrade;\n      proxy_set_header Connection "upgrade";\n      proxy_read_timeout 86400;\n    }\n  }\n}\n' > /etc/nginx/nginx.conf && cat /etc/nginx/nginx.conf

EXPOSE 6205
CMD ["/usr/sbin/nginx"]
