FROM node:20-alpine
RUN apk add --no-cache python3 py3-pip
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
RUN pip3 install reportlab --break-system-packages --quiet
COPY src/ ./src/
COPY migrations/ ./migrations/
EXPOSE 4000
CMD ["node", "src/index.js"]
