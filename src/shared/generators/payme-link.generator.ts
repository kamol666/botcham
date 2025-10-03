import logger from '../utils/logger';
import { config } from '../config';

export type PaymeLinkGeneratorParams = {
  planId: string;
  userId: string;
  amount: number;
  selectedService?: string;
  selectedSport?: string;
};

const PAYME_CHECKOUT_URL = 'https://checkout.paycom.uz';

export function generatePaymeLink(params: PaymeLinkGeneratorParams): string {
  const merchantId = config.PAYME_MERCHANT_ID;
  const amountInTiyns = params.amount * 100;
  const selectedService =
    params.selectedService ?? params.selectedSport ?? 'yulduz';

  const linkParams = [
    `m=${merchantId}`,
    `ac.plan_id=${params.planId}`,
    `ac.user_id=${params.userId}`,
    `ac.selected_service=${selectedService}`,
    `ac.selected_sport=${selectedService}`,
    `a=${amountInTiyns}`,
  ];

  const paramsInString = linkParams.join(';');
  logger.info('Payme params: ' + paramsInString);
  const encodedParams = base64Encode(paramsInString);
  const finalLink = `${PAYME_CHECKOUT_URL}/${encodedParams}`;
  logger.info('Generated Payme link: ' + finalLink);
  return finalLink;
}

function base64Encode(input: string): string {
  return Buffer.from(input).toString('base64');
}
