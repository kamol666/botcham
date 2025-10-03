# 🖥️ Server Setup Qo'llanmasi

## 1. Ubuntu Server Update
```bash
sudo apt update && sudo apt upgrade -y
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000  # Bot uchun
```

## 2. Node.js O'rnatish
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pm2
npm install -g pnpm
```

## 3. MongoDB O'rnatish
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

## 4. Nginx O'rnatish (Optional - SSL uchun)
```bash
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 5. Git O'rnatish
```bash
sudo apt install git
```
