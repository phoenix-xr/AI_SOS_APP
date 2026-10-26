FROM python:3.12-slim

# Install uv from Astral official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Enable bytecode compilation and disable python output buffering
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Copy dependency specifications first to leverage Docker layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies without installing the project itself yet
RUN uv sync --frozen --no-install-project --no-dev

# Copy application source code
COPY . .

# Install the project
RUN uv sync --frozen --no-dev

# Place virtual environment in PATH
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# Start Uvicorn server
CMD ["uvicorn", "backend_h.main:app", "--host", "0.0.0.0", "--port", "8000"]
