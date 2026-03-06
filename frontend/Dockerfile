# 生产环境运行阶段
FROM nginx:stable-alpine AS production-stage

# 直接复制服务器本地已经构建好的产物
COPY ./dist /usr/share/nginx/html

# 复制自定义 Nginx 配置
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://api:4000/api/; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
