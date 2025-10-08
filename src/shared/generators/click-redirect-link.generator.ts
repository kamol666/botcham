import { ConfigService } from '@nestjs/config';

export type ClickRedirectParams = {
  amount: number;
  planId: string;
  userId: string;
  selectedService?: string;
};
const CLICK_URL = `https://my.click.uz`;
const BOT_URL = 'https://t.me/n17kamolBot';

export function getClickRedirectLink(params: ClickRedirectParams) {
  const configService = new ConfigService();
  const serviceId = configService.get<number>('CLICK_SERVICE_ID');
  const merchantId = configService.get<string>('CLICK_MERCHANT_ID');
  const selectedService = params.selectedService ?? 'yulduz';

  const searchParams = new URLSearchParams({
    service_id: String(serviceId),
    merchant_id: String(merchantId),
    amount: String(params.amount),
    transaction_param: params.planId,
    return_url: BOT_URL,
  });

  searchParams.append('additional_param1', params.userId);
  searchParams.append('additional_param2', selectedService);

  return `${CLICK_URL}/services/pay?${searchParams.toString()}`;
}

// &return_url=https://t.me/sportsuz_premium_bot
