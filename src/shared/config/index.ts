import dotenv from 'dotenv';
import { cleanEnv, num, str } from 'envalid';

export type SubscriptionType = 'basic';

dotenv.config();

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
