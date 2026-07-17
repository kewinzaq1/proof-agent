FROM node:22-slim

RUN npm install -g @zeroxyz/cli@latest

WORKDIR /app
COPY package.json server.mjs ./

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["npm", "start"]
