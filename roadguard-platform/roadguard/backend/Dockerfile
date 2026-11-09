FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# Install minimal OS dependencies for OpenCV headless and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source tree preserving roadguard module structure
COPY . /app/roadguard/backend
COPY ./app /app/roadguard/backend/app

# Ensure uploads directory structure exists
RUN mkdir -p /app/roadguard/backend/uploads/raw \
    /app/roadguard/backend/uploads/annotated \
    /app/roadguard/backend/uploads/xai \
    /app/roadguard/backend/uploads/repairs

EXPOSE 8000

CMD ["uvicorn", "roadguard.backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
