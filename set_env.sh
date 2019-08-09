#!/usr/bin/env bash

## MYSQL
export AWS_MYSQL_HOST="esgrodb.cmuwidwxnyfk.us-east-1.rds.amazonaws.com"
export AWS_MYSQL_USERNAME="esgro"
export AWS_MYSQL_DBNAME="esgro_db_dev"
export AWS_MYSQL_PASSWORD="$1"

### AWS
export AWS_KEY="AKIAXX34KPBQRSO67DG5"
export AWS_SECRET="$2"
export AWS_DEPLOY_REGION="us-east-1"

##
export AWS_USER_REGISTERED_TOPIC_ARN="arn:aws:sns:us-east-1:532299806817:user-registered"
export AWS_USER_WALLET_REGISTERED_TOPIC_ARN="arn:aws:sns:us-east-1:532299806817:user-wallet-registered"

