#!/usr/bin/env bash

## MYSQL
export AWS_MYSQL_HOST="database-1-test.c4pfxggmilyu.us-east-1.rds.amazonaws.com"
export AWS_MYSQL_USERNAME="admin"
export AWS_MYSQL_DBNAME="ryan_db_local"
export AWS_ENDPOINT="http://127.0.0.1:4002"
export AWS_MYSQL_PASSWORD="Cody123!"

### AWS
export AWS_KEY="AKIASKB57BNKEKAVKKUX"
export AWS_SECRET="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"
export AWS_DEPLOY_REGION="us-east-1"

## SMS
export TWILIO_SID="AC8534fa4debef4a8765190a08c19b1752"
export TWILIO_TOKEN="79445ce041ea2778d538fd5cff4d766e"
export TWILIO_FROM="+19802176789"

##
export AWS_USER_REGISTERED_TOPIC_ARN="arn:aws:sns:us-east-1:159043750740:user-registered"
export AWS_USER_WALLET_REGISTERED_TOPIC_ARN="arn:aws:sns:us-east-1:159043750740:user-wallet-registered"
export AWS_USER_WALLET_KYC_CHANGED_TOPIC_ARN="arn:aws:sns:us-east-1:159043750740:user-wallet-kyc_changed"
export AWS_LEDGER_ADDED_TOPIC_ARN="arn:aws:sns:us-east-1:159043750740:ledger-added"


