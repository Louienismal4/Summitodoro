terraform {
  required_version = ">= 1.15.0"

  backend "s3" {
    bucket       = "summitodoro-tf-state-656032436311-ap-southeast-1"
    key          = "environments/development/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for Summitodoro development infrastructure."
  type        = string
  default     = "ap-southeast-1"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  value = data.aws_region.current.region
}

output "caller_arn" {
  value = data.aws_caller_identity.current.arn
}