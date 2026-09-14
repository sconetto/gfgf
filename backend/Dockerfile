# syntax=docker/dockerfile:1

FROM python:3.12-slim

# uv for lockfile-accurate dependency installation (matches local uv version).
COPY --from=ghcr.io/astral-sh/uv:0.10.4 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Install dependencies first so the layer caches independently of app code.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app ./app

ENV PATH="/app/.venv/bin:$PATH"

RUN groupadd --system gfgf && useradd --system --gid gfgf --create-home gfgf
USER gfgf

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
