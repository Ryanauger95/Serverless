#!/usr/bin/env bash

## MYSQL
export AWS_MYSQL_HOST="database-1-test.c4pfxggmilyu.us-east-1.rds.amazonaws.com"
export AWS_MYSQL_USERNAME="admin"
export AWS_MYSQL_DBNAME="ryan_db_dev"
export AWS_MYSQL_PASSWORD="Cody123!"

### AWS
export AWS_KEY="AKIASKB57BNKEKAVKKUX"
export AWS_SECRET="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"
export AWS_DEPLOY_REGION="us-east-1"

## SMS
# export TWILIO_SID="AC2e1a04385458c5aa939ee5c24c204f47"
# export TWILIO_TOKEN="7657eb9548f571bc363df22dd774f409"
# export TWILIO_FROM="+17048598592"

##
export AWS_USER_REGISTERED_TOPIC_ARN="arn:aws:sns:us-east-1:159043750740:user-registered"
export AWS_USER_WALLET_REGISTERED_TOPIC_ARN="arn:aws:sns:us-east-1:159043750740:user-wallet-registered"
export AWS_USER_WALLET_KYC_CHANGED_TOPIC_ARN="arn:aws:sns:us-east-1:159043750740:user-wallet-kyc_changed"

