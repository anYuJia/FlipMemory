# 生产环境运行阶段
FROM nginx:stable-alpine AS production-stage

# 直接复制服务器本地已经构建好的产物
COPY ./dist /usr/share/nginx/html

# 复制自定义 Nginx 配置
RUN echo 'server { \
    listen 80; \
\
    # gzip 压缩 \
    gzip on; \
    gzip_min_length 1024; \
    gzip_comp_level 5; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml; \
    gzip_vary on; \
\
    # 带 hash 的静态资源 — 永久缓存 \
    location /assets/ { \
        root /usr/share/nginx/html; \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
        access_log off; \
    } \
\
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
        # index.html 不缓存，确保用户拿到最新入口 \
        if ($request_filename ~* /index\.html$) { \
            add_header Cache-Control "no-cache"; \
        } \
    } \
    location /api/ { \
        proxy_pass http://api:4000/api/; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
