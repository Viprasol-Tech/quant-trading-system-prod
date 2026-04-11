FROM alpine:latest

RUN apk add --no-cache nginx

WORKDIR /app
COPY dist /usr/share/nginx/html
COPY default.conf /etc/nginx/nginx.conf

EXPOSE 6205
CMD ["/usr/sbin/nginx"]
