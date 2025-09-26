import dotenv from 'dotenv';
import { cleanEnv, num, str } from 'envalid';

export type SubscriptionType = 'basic';

dotenv.config();

console.log('🔍 ENV CHANNEL_ID:', process.env.CHANNEL_ID);

export const config = cleanEnv(process.env, {
  APP_PORT: num(),
  BOT_TOKEN: str(),
  MONGODB_URI: str(),
  CHANNEL_ID: str(),
  BASE_URL: str(),
  NODE_ENV: str({
    choices: ['development', 'production'],
    default: 'development',
  }),

  CLICK_SERVICE_ID: str(),
  CLICK_MERCHANT_ID: str(),
  CLICK_SECRET: str(),
  CLICK_MERCHANT_USER_ID: str(),

  PAYME_MERCHANT_ID: str(),
  PAYME_LOGIN: str(),
  PAYME_PASSWORD: str(),
  PAYME_PASSWORD_TEST: str(),
});

// Debug: Config validation
console.log('🔧 Loaded config CHANNEL_ID:', config.CHANNEL_ID);
if (config.CHANNEL_ID !== '-1002668007049') {
  console.error('❌ XATO! CHANNEL_ID noto\'g\'ri:', config.CHANNEL_ID);
  console.error('❌ Kerakli CHANNEL_ID: -1002668007049');
} else {
  console.log('✅ CHANNEL_ID to\'g\'ri!');
}
