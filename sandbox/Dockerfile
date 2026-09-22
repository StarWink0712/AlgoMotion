FROM python:3.12.12-slim-bookworm
LABEL org.algomotion.runner="1"
WORKDIR /runner
COPY main.py /runner/main.py
USER 65532:65532
ENTRYPOINT ["python", "-I", "-B", "/runner/main.py"]
