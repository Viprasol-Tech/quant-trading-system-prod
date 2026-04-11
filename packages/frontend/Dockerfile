FROM busybox:latest

COPY dist /data

EXPOSE 6205

CMD ["sh", "-c", "cd /data && exec busybox httpd -f -p 6205"]
