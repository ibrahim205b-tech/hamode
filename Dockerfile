# حمودي الخبير — صورة إنتاج
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && groupadd -r app && useradd -r -g app app
COPY --from=build /app ./
USER app
EXPOSE 3000
# تطبيق ترحيلات قاعدة البيانات ثم تشغيل الخادم
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p ${PORT:-3000}"]
