#!/bin/bash
# 🔄 Avtomatik Backup Script

# Ranglar
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Backup papkasi
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}🔄 Backup jarayoni boshlandi...${NC}"

# Backup papkasini yaratish
mkdir -p $BACKUP_DIR

# 1. MongoDB backup
echo -e "${YELLOW}📂 MongoDB backup olinmoqda...${NC}"
mongodump --db sportsuz-premium-bot --out $BACKUP_DIR/mongodb_$DATE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ MongoDB backup muvaffaqiyatli!${NC}"
else
    echo -e "${RED}❌ MongoDB backup xatolik!${NC}"
    exit 1
fi

# 2. Kod fayllari backup
echo -e "${YELLOW}💾 Kod fayllari backup olinmoqda...${NC}"
tar -czf $BACKUP_DIR/code_backup_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=logs \
    --exclude=.git \
    /home/kamoliddin/Desktop/sportsuz-premium-bot-main/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Kod backup muvaffaqiyatli!${NC}"
else
    echo -e "${RED}❌ Kod backup xatolik!${NC}"
fi

# 3. .env fayl backup (alohida)
echo -e "${YELLOW}🔐 .env fayl backup olinmoqda...${NC}"
cp /home/kamoliddin/Desktop/sportsuz-premium-bot-main/.env $BACKUP_DIR/env_backup_$DATE

# 4. Backup hajmini ko'rsatish
echo -e "${GREEN}📊 Backup ma'lumotlari:${NC}"
ls -lh $BACKUP_DIR/ | grep $DATE

# 5. Eski backuplarni tozalash (7 kundan eski)
echo -e "${YELLOW}🧹 Eski backuplar tozalanmoqda...${NC}"
find $BACKUP_DIR -type f -mtime +7 -delete

echo -e "${GREEN}🎉 Backup muvaffaqiyatli tugallandi!${NC}"
echo -e "📁 Backup joylashgan: $BACKUP_DIR"
