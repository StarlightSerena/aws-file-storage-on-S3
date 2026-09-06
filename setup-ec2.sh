#!/bin/bash
# AWS EC2 Setup Script for Cloud-Based File Storage System (Amazon Linux 2023 & Ubuntu Compatible)

set -e

echo "========================================================="
echo "🚀 Starting Cloud-Based File Storage Setup on AWS EC2..."
echo "========================================================="

# Detect Package Manager (dnf/yum for Amazon Linux, apt for Ubuntu)
if command -v dnf &> /dev/null; then
    echo "📦 Detected Amazon Linux (dnf). Installing Node.js..."
    sudo dnf install -y nodejs build-essential
elif command -v apt-get &> /dev/null; then
    echo "📦 Detected Ubuntu/Debian (apt). Installing Node.js..."
    sudo apt update -y
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs build-essential
else
    echo "❌ Unsupported Linux Distribution."
    exit 1
fi

# Verify Node.js and NPM
echo "✅ Node.js Version: $(node -v)"
echo "✅ NPM Version:     $(npm -v)"

# Install PM2 Process Manager globally
echo "⚙️ Installing PM2 process manager..."
sudo npm install -g pm2

# Navigate to backend directory
if [ -d "backend" ]; then
    cd backend
fi

# Install dependencies
echo "📥 Installing backend project dependencies..."
npm install

# Launch application with PM2
echo "▶️ Launching S3 Vault backend with PM2..."
pm2 stop cloud-storage 2>/dev/null || true
pm2 start server.js --name "cloud-storage"

# Save PM2 process list
pm2 save
echo "🔄 Configuring PM2 auto-restart on system reboot..."
sudo env PATH=$PATH:/usr/bin /usr/local/bin/pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

echo "========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "Your Cloud-Based File Storage System is live!"
echo "Check status: pm2 status"
echo "View logs:    pm2 logs cloud-storage"
echo "========================================================="
