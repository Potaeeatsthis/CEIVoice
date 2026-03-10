FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ONLY the necessary files for running the worker
COPY trained_ticket_model/ ./trained_ticket_model/
COPY email_templates.py .
COPY main.py .

# Environment Variables
# Ensures logs are sent straight to the terminal without being buffered
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["python", "main.py"]
