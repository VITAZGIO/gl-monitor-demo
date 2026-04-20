FROM python:3.11-slim

WORKDIR /publisher

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY publisher.py .

CMD ["python", "publisher.py"]
