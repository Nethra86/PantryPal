FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (curl for healthcheck, build-essential if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code and migrations
COPY . .

# Create volume mount point for persistent SQLite database
VOLUME /app/data
ENV DATABASE_URL="sqlite:////app/data/pantrypal.db"
ENV ENVIRONMENT="production"
ENV CORS_ORIGINS="http://localhost:5173,http://localhost:80,http://127.0.0.1:80"

EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
