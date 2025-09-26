#!/usr/bin/env node

// Tez telefon masklanish testi - serverga bog'liq emas
console.log('📞 TELEFON RAQAMI MASKLANISH TESTI\n');

// EJS template dan olingan logika (Click API uchun yangilangan)
function maskPhoneNumber(phone) {
    console.log(`🔍 Input: "${phone}"`);

    if (phone) {
        // Telefon raqamini tozalash (faqat raqamlar va *)
        const originalPhone = phone.toString();

        // Agar telefon raqami allaqachon masked bo'lsa (Click API dan kelgan)
        if (originalPhone.includes('*')) {
            console.log(`  ⭐ Allaqachon masked format: "${originalPhone}"`);
            // Oxirgi raqamlarni topish (turli formatlarni qo'llab-quvvatlash)

            // 1. Oxirda 4 ta raqam: 99890*****1234
            let matches = originalPhone.match(/(\d{4})$/);
            if (matches) {
                const lastFour = matches[1];
                console.log(`  🔢 Oxirda 4 ta raqam topildi: "${lastFour}"`);
                const maskedPhone = `+998 ** *** ${lastFour}`;
                console.log(`  ✅ Natija: "${maskedPhone}"\n`);
                return maskedPhone;
            }

            // 2. Oxirda 3 ta raqam: 90*****567
            matches = originalPhone.match(/(\d{3})$/);
            if (matches) {
                const lastThree = matches[1];
                console.log(`  🔢 Oxirda 3 ta raqam topildi: "${lastThree}"`);
                const maskedPhone = `+998 ** *** ${lastThree}`;
                console.log(`  ✅ Natija: "${maskedPhone}"\n`);
                return maskedPhone;
            }

            // 3. Oxirda 2 ta raqam: +998 90 *** ** 67
            matches = originalPhone.match(/(\d{2})$/);
            if (matches) {
                const lastTwo = matches[1];
                console.log(`  🔢 Oxirda 2 ta raqam topildi: "${lastTwo}"`);
                const maskedPhone = `+998 ** *** ${lastTwo}`;
                console.log(`  ✅ Natija: "${maskedPhone}"\n`);
                return maskedPhone;
            }

            // Agar hech narsa topilmasa, originalni qaytaramiz
            console.log(`  ⚠️ Oxirgi raqamlar topilmadi, originalni qaytarish`);
            const maskedPhone = originalPhone.startsWith('+998') ? originalPhone : `+998 ${originalPhone}`;
            console.log(`  ✅ Natija: "${maskedPhone}"\n`);
            return maskedPhone;
        }

        // Oddiy raqamlarni tozalash
        const cleanPhone = originalPhone.replace(/\D/g, '');
        console.log(`  🧹 Tozalangan: "${cleanPhone}"`);

        let maskedPhone;
        if (cleanPhone.length >= 4) {
            // Oxirgi 4 ta raqamni olish
            const lastFour = cleanPhone.slice(-4);
            console.log(`  🔢 Oxirgi 4 ta: "${lastFour}"`);

            // Uzbekiston formati uchun
            if (cleanPhone.startsWith('998') && cleanPhone.length >= 12) {
                maskedPhone = `+998 ** *** ${lastFour}`;
            } else if (cleanPhone.length >= 9) {
                maskedPhone = `+998 ** *** ${lastFour}`;
            } else {
                maskedPhone = `*** ** *** ${lastFour}`;
            }
        } else {
            maskedPhone = '+998 ** *** 4567'; // default
        }

        console.log(`  ✅ Natija: "${maskedPhone}"\n`);
        return maskedPhone;
    } else {
        console.log('  ⚠️ Phone parameter yo\'q');
        console.log('  ✅ Default: "+998 ** *** 4567"\n');
        return '+998 ** *** 4567';
    }
}

// Test holatlar
const testCases = [
    // To'g'ri formatlar
    '998901234567',
    '+998901234567',
    '998 90 123 45 67',
    '8600123456789012', // Uzcard format

    // Click API dan kelishi mumkin bo'lgan formatlar
    '99890*****1234', // Click masked format - 4 ta oxirgi raqam
    '99890*****567', // Click masked format - 3 ta oxirgi raqam  
    '90*****567', // Click qisqa masked format - 3 ta oxirgi
    '90*****12', // Click qisqa masked format - 2 ta oxirgi
    '+998 90 *** ** 67', // Click spaced format - 2 ta oxirgi
    '998*****1234', // Click boshqa format - 4 ta oxirgi
    '998901234567', // Click full format

    // Edge cases
    '1234', // qisqa raqam
    '', // bo'sh
    null, // null
    undefined, // undefined

    // Noto'g'ri formatlar
    '12345678901234567890', // juda uzun
    'abc123def', // harflar bilan
];

console.log('🧪 TEST HOLATLARI:\n');
console.log('📱 CLICK API TELEFON FORMATLARINI HAM TEST QILAMIZ:\n');

testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. Test:`);
    maskPhoneNumber(testCase);
});

console.log('✅ Barcha testlar tugadi!');
console.log('💡 Bu skriptni ishlatish: node quick-phone-test.js');
