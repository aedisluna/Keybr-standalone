# Check WinGet
winget --version

# Install WSL 2 support
wsl --install --no-distribution
wsl --update
wsl --set-default-version 2

# Reboot Windows after WSL installation

# Install Docker Desktop
winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements

# Start Docker Desktop manually from Start Menu
# Verify Docker working
docker run hello-world
