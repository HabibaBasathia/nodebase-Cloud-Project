variable "region" { default = "us-east-1" }
variable "aws_access_key" {}
variable "aws_secret_key" {}
variable "db_password" {}
variable "better_auth_secret" {}
variable "encryption_key" {}
variable "google_client_id" {}
variable "google_client_secret" {}
variable "gh_client_id" {}
variable "gh_client_secret" {}
variable "openai_api_key" {}
variable "lambda_image_tag" {
  type        = string
  description = "Dynamic tag passed from GitHub Actions"
}