import re

with open('Dockerfile', 'r') as f:
    docker_code = f.read()

# Add ffmpeg to runner stage
docker_code = docker_code.replace(
    "RUN apk add --no-cache openssl",
    "RUN apk add --no-cache openssl ffmpeg"
)

with open('Dockerfile', 'w') as f:
    f.write(docker_code)

print("Dockerfile updated with ffmpeg")
