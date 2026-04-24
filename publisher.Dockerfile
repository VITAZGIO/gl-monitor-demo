FROM python:3.11-slim

WORKDIR /code

RUN pip install --no-cache-dir paho-mqtt

COPY publisher.py .

CMD ["python", "publisher.py"]
