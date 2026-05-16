terraform {
  backend "s3" {
    bucket = "nodebase-terraform-state-bucket-habiba"
    key    = "global/s3/terraform.tfstate"
    region = "us-east-1"
  }
}


provider "aws" {
  region     = var.region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

# --- 1. NETWORKING ---
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "nodebase-final-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "pub_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "pub_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.region}b"
  map_public_ip_on_launch = true
}

resource "aws_route_table" "rt" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.pub_a.id
  route_table_id = aws_route_table.rt.id
}

resource "aws_route_table_association" "b" {
  subnet_id      = aws_subnet.pub_b.id
  route_table_id = aws_route_table.rt.id
}

# --- 2. SECURITY GROUPS ---
resource "aws_security_group" "alb_sg" {
  name   = "nodebase-alb-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "app_sg" {
  name   = "nodebase-app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds_sg" {
  name   = "nodebase-rds-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }
}

# --- 3. DATABASE & STORAGE ---
resource "aws_db_subnet_group" "db_subs" {
  name       = "nodebase-db-group"
  subnet_ids = [aws_subnet.pub_a.id, aws_subnet.pub_b.id]
}

resource "aws_db_instance" "db" {
  identifier             = "nodebase-db-final"
  engine                 = "postgres"
  instance_class         = "db.t4g.micro"
  allocated_storage      = 20
  db_name                = "nodebase"
  username               = "postgres"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.db_subs.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = true
  publicly_accessible    = false
}

resource "aws_s3_bucket" "storage" {
  bucket = "cloud-project-habiba-final"
}

resource "aws_sqs_queue" "queue" {
  name = "nodebase-notification-queue"
}

resource "aws_ecr_repository" "lambda_repo" {
  name         = "nodebase-lambda-worker"
  force_delete = true
}

resource "aws_ecr_repository" "repo" {
  name         = "nodebase-app-repo"
  force_delete = true
}

resource "aws_cloudwatch_log_group" "ecs_logs" {
  name = "/ecs/nodebase-app"
}

# --- 4. IAM ROLES ---
resource "aws_iam_role" "ecs_exec" {
  name = "nodebase-exec-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "exec_attach" {
  role       = aws_iam_role.ecs_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "nodebase-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "task_p" {
  name = "nodebase-task-policy"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action   = ["s3:*", "sqs:*"],
      Effect   = "Allow",
      Resource = "*"
    }]
  })
}

# --- 5. COMPUTE (ALB & ECS) ---
resource "aws_lb" "alb" {
  name               = "nodebase-alb"
  load_balancer_type = "application"
  subnets            = [aws_subnet.pub_a.id, aws_subnet.pub_b.id]
  security_groups    = [aws_security_group.alb_sg.id]
}

resource "aws_lb_target_group" "nodebase_tg" {
  name        = "nodebase-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
  path                = "/api/health"
  interval            = 30
  timeout             = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3
  matcher             = "200-399"
}
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.nodebase_tg.arn 
  }
}

resource "aws_ecs_cluster" "cluster" {
  name = "nodebase-cluster-final"
}

resource "aws_ecs_task_definition" "task" {
  family                   = "nodebase-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_exec.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "nodebase-container"
    image = "${aws_ecr_repository.repo.repository_url}:latest"
    portMappings = [{ containerPort = 3000 }]
    environment = [
      { name = "DATABASE_URL", value = "postgresql://postgres:medipack00%23@${aws_db_instance.db.endpoint}/nodebase" },
      { name = "DIRECT_URL", value = "postgresql://postgres:medipack00%23@${aws_db_instance.db.endpoint}/nodebase" },
      { name = "SQS_QUEUE_URL", value = aws_sqs_queue.queue.id },
      { name = "NEXT_PUBLIC_APP_URL", value = "http://${aws_lb.alb.dns_name}" },
      { name = "BETTER_AUTH_URL", value = "http://${aws_lb.alb.dns_name}" },
      { name = "BETTER_AUTH_SECRET", value = var.better_auth_secret },
      { name = "ENCRYPTION_KEY", value = var.encryption_key },
      # --- CORRECTED MAPPINGS BELOW ---
      { name = "GOOGLE_CLIENT_ID", value = var.google_client_id },
      { name = "GOOGLE_CLIENT_SECRET", value = var.google_client_secret },
      { name = "GITHUB_CLIENT_ID", value = var.gh_client_id },
      { name = "GITHUB_CLIENT_SECRET", value = var.gh_client_secret },
      # --------------------------------
      { name = "OPENAI_API_KEY", value = var.openai_api_key },
      { name = "AWS_BUCKET_NAME", value = aws_s3_bucket.storage.id },
      { name = "AWS_REGION", value = var.region },
      { name = "AUTH_TRUST_HOST", value = "true" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name,
        "awslogs-region"        = var.region,
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_ecs_service" "service" {
  name            = "nodebase-service"
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.task.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = [aws_subnet.pub_a.id, aws_subnet.pub_b.id]
    assign_public_ip = true
    security_groups  = [aws_security_group.app_sg.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.nodebase_tg.arn
    container_name   = "nodebase-container"
    container_port   = 3000
  }
}

# --- 6. LAMBDA WORKER ---
resource "aws_iam_role" "lambda_role" {
  name = "nodebase-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "worker" {
  function_name = "nodebase-workflow-worker-v2"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.lambda_repo.repository_url}:${var.lambda_image_tag}"
  
  environment {
    variables = {
      DATABASE_URL = "postgresql://postgres:medipack00%23@${aws_db_instance.db.endpoint}/nodebase"
    }
  }
}

output "alb_dns" {
  value = aws_lb.alb.dns_name
}
