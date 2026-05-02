# Deploy NEXUS to AWS EC2 Free Tier

This plan outlines the steps to deploy the containerized NEXUS Robot Command Center to an AWS EC2 instance, fulfilling the deployment requirements outlined in the PRD.

> [!WARNING]
> **AWS Credentials Missing**
> I attempted to check your AWS CLI configuration, but the credentials currently configured are invalid (`InvalidClientTokenId`). **I cannot deploy the application autonomously until this is fixed.**

## User Review Required

Please choose how you would like to proceed with the deployment:

**Option 1: Guided Manual Deployment (Recommended)**
You run `aws configure` in your terminal to provide valid Access Keys. Once configured, I will use the AWS CLI to:
1. Create a Security Group opening port 8000.
2. Launch a `t2.micro` EC2 instance with a startup script (User Data) that automatically installs Docker, pulls your code from GitHub (or copies the files), and runs `docker-compose up`.

**Option 2: Infrastructure as Code (CloudFormation)**
I can write an AWS CloudFormation template (`nexus-deployment.yaml`). You can then upload this file directly in the AWS Console (browser), which will automatically provision the EC2 server and deploy the app without needing local AWS CLI credentials.

## Open Questions

1. Which deployment method (Option 1 or Option 2) do you prefer?
2. If Option 1, please run `aws configure` and let me know when you're ready.
3. Will you be pushing the current code to a public GitHub repository? If so, the EC2 server can simply `git clone` the repository to run it, which is the easiest way to transfer the code.

## Proposed Steps (assuming Option 1 and a public GitHub repo)

### 1. Preparation
- Verify AWS CLI credentials.
- Ensure all latest changes are committed and pushed to GitHub.

### 2. Infrastructure Setup (AWS CLI)
- Create a new Security Group `nexus-sg`.
- Add an inbound rule allowing TCP traffic on port 8000 from `0.0.0.0/0`.
- Add an inbound rule allowing SSH (port 22) for debugging.

### 3. Server Provisioning
- Launch an Amazon Linux 2023 `t2.micro` instance.
- Provide a User Data script that:
  - Installs Docker and Docker Compose.
  - Clones the NEXUS repository.
  - Runs `docker-compose up -d --build`.

### 4. Verification
- Retrieve the public IP address of the EC2 instance.
- Wait a few minutes for the server to initialize.
- Verify the dashboard is accessible at `http://<ec2-public-ip>:8000`.
