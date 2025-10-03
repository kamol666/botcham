#!/bin/bash

# 🚀 Sportsuz Bot Deployment Script

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json topilmadi. Loyiha katalogiga o'ting!"
    exit 1
fi

print_status "Dependencies o'rnatilmoqda..."
pnpm install

print_status "TypeScript kod JavaScript ga kompilyatsiya qilinmoqda..."
pnpm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build muvaffaqiyatsiz tugadi!"
    exit 1
fi

print_status "Logs papkasi yaratilmoqda..."
mkdir -p logs

print_status "Environment variables tekshirilmoqda..."
if [ ! -f ".env" ]; then
    print_warning ".env fayli topilmadi. .env.production dan nusxa ko'chirilmoqda..."
    cp .env.production .env
fi

print_status "PM2 bilan botni ishga tushirish..."

# Stop existing process if running
pm2 stop sportsuz-bot 2>/dev/null || true
pm2 delete sportsuz-bot 2>/dev/null || true

# Start the bot
pm2 start ecosystem.config.json

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup || print_warning "PM2 startup sozlash uchun sudo huquqi kerak"

print_status "Deployment tugallandi! ✅"
print_status "Bot holati:"
pm2 status

print_status "Loglarni ko'rish uchun:"
echo "pm2 logs sportsuz-bot"
echo "pm2 monit"

print_status "Bot to'xtatish uchun:"
echo "pm2 stop sportsuz-bot"

print_status "Bot qayta ishga tushirish uchun:"
echo "pm2 restart sportsuz-bot"
