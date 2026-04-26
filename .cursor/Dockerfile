# Use Node.js LTS version as base image
FROM node:20-slim

# Install essential development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Global npm writes to /usr/local — must run as root (before USER ubuntu)
RUN npm install -g npm@latest

# Create a non-root user
RUN useradd -m -s /bin/bash ubuntu

# Set user and working directory
USER ubuntu
WORKDIR /home/ubuntu

# Set environment variables
ENV NODE_ENV=development
ENV PATH="/home/ubuntu/node_modules/.bin:${PATH}"

# Keep container running
CMD ["/bin/bash"]

