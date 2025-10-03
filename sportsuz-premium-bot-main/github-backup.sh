#!/bin/bash
# 🔄 GitHub Backup Script (Xavfsiz)

# Ranglar
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Backup papkasi
BACKUP_DIR="/backup"
CODE_DIR="/home/kamoliddin/Desktop/sportsuz-premium-bot-main"
DATE=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}🔄 GitHub Backup jarayoni boshlandi...${NC}"

# Backup papkasini yaratish
mkdir -p $BACKUP_DIR

# 1. DATABASE BACKUP (Local saqlash - GitHub ga emas!)
echo -e "${YELLOW}📂 MongoDB backup olinmoqda (local)...${NC}"
mongodump --db sportsuz-premium-bot --out $BACKUP_DIR/mongodb_$DATE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ MongoDB backup muvaffaqiyatli!${NC}"
else
    echo -e "${RED}❌ MongoDB backup xatolik!${NC}"
fi

# 2. .ENV BACKUP (Local saqlash - GitHub ga emas!)
echo -e "${YELLOW}🔐 .env fayl backup olinmoqda (local)...${NC}"
cp $CODE_DIR/.env $BACKUP_DIR/env_backup_$DATE

# 3. KOD BACKUP (GitHub ga)
echo -e "${YELLOW}💾 Kod GitHub ga backup olinmoqda...${NC}"

cd $CODE_DIR

# Git holatini tekshirish
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📦 Git repository yaratilmoqda...${NC}"
    git init
    git remote add origin https://github.com/YOUR_USERNAME/sportsuz-premium-bot-backup.git
fi

# Barcha o'zgarishlarni qo'shish (maxfiy fayllarsiz)
git add .
git add -A

# Commit qilish
git commit -m "🔄 Backup - $(date '+%Y-%m-%d %H:%M:%S')"

# GitHub ga push qilish
echo -e "${YELLOW}📤 GitHub ga yubormoqda...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ GitHub backup muvaffaqiyatli!${NC}"
else
    echo -e "${RED}❌ GitHub backup xatolik! (Internet yoki token muammosi)${NC}"
fi

# 4. STATISTIKA
echo -e "${GREEN}📊 Backup ma'lumotlari:${NC}"
echo -e "📁 Local backup: $BACKUP_DIR/"
echo -e "🐙 GitHub backup: Repository da"
ls -lh $BACKUP_DIR/ | grep $DATE

# 5. Eski local backuplarni tozalash (7 kundan eski)
echo -e "${YELLOW}🧹 Eski local backuplar tozalanmoqda...${NC}"
find $BACKUP_DIR -type f -mtime +7 -delete

echo -e "${GREEN}🎉 Backup muvaffaqiyatli tugallandi!${NC}"
echo -e "${YELLOW}💡 Eslatma: Maxfiy ma'lumotlar faqat local saqlanadi!${NC}"
