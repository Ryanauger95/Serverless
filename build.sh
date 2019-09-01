#!/usr/bin/env bash

docker build -t serverless-env .
docker run -v $(pwd):/lambda-project -it serverless-env