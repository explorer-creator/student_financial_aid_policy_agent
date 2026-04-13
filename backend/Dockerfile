# Official mirror on ECR Public — avoids docker.io (timeouts / "not found" behind some CN mirrors).
FROM public.ecr.aws/docker/library/python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
# 本地联调 RAG 时文档在仓库根目录的 docs/ 与 frontend/public/docs/；若需镜像内带文档，请用仓库根的 Dockerfile.api 构建。

ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
