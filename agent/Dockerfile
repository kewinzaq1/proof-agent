FROM node:22-slim

RUN npm install -g @zeroxyz/cli@latest

WORKDIR /app
COPY package.json server.mjs ./
RUN npm install --omit=dev

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["npm", "start"]
