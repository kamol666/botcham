import logger from '../utils/logger';
import { config } from '../config';

export type PaymeLinkGeneratorParams = {
  planId: string;
  userId: string;
  amount: number;
  selectedService?: string;
};

const PAYME_CHECKOUT_URL = 'https://checkout.paycom.uz';

export function generatePaymeLink(params: PaymeLinkGeneratorParams): string {
  const merchantId = config.PAYME_MERCHANT_ID;
  const amountInTiyns = params.amount * 100;
  const selectedService = params.selectedService ?? 'yulduz';
  const paramsInString = `m=${merchantId};ac.plan_id=${params.planId};ac.user_id=${params.userId};ac.selected_service=${selectedService};a=${amountInTiyns}`;
  logger.info(paramsInString);
  const encodedParams = base64Encode(paramsInString);
  return `${PAYME_CHECKOUT_URL}/${encodedParams}`;
}

function base64Encode(input: string): string {
  return Buffer.from(input).toString('base64');
}
