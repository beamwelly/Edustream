# ──────────────────────────────────────────────
# Stage 1 – Build the React/Vite application
# ──────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies first (layer-cache friendly)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# VITE_API_URL is a BUILD ARG only — it is used by Vite at compile time
# and is NOT stored as an ENV in the final image.
ARG VITE_API_URL=http://localhost:8000
RUN VITE_API_URL=${VITE_API_URL} npm run build

# ──────────────────────────────────────────────
# Stage 2 – Serve with Nginx on port 80
# ──────────────────────────────────────────────
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Add SPA-friendly nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist/client /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
