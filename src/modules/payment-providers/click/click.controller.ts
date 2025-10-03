import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ClickRequest } from './types/click-request.type';
import { ClickService } from './click.service';
import logger from '../../../shared/utils/logger';

@Controller('click')
export class ClickController {
  constructor(private readonly clickService: ClickService) {
    console.log('ClickController initialized');
  }

  @Post('')
  @HttpCode(HttpStatus.OK)
  async handleMerchantTransactions(@Req() req: any) {
    try {
      const clickReqBody = req.body;
      logger.info(`Click callback received: ${JSON.stringify(clickReqBody)}`);

      // Oddiy javob qaytarish
      return {
        click_trans_id: clickReqBody.click_trans_id || 0,
        merchant_trans_id: clickReqBody.merchant_trans_id || '',
        error: 0,
        error_note: "Success"
      };
    } catch (error) {
      logger.error(`Click callback error: ${error}`);
      return {
        click_trans_id: 0,
        merchant_trans_id: '',
        error: -1,
        error_note: "Error"
      };
    }
  }
}
