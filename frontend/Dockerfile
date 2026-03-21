FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ sqlite

# Copy all files
COPY . .

# Install all dependencies (need devDependencies for build)
RUN npm install

# Build the application
RUN npm run build

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Start the application with preview
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
