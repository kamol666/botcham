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
      const clickReqBody = req.body as ClickRequest;
      logger.info(`Click callback received: ${JSON.stringify(clickReqBody)}`);

      return await this.clickService.handleMerchantTransactions(clickReqBody);
    } catch (error) {
      logger.error(`Click callback error: ${error}`);
      return {
        click_trans_id: 0,
        merchant_trans_id: '',
        error: -1,
        error_note: 'Error',
      };
    }
  }
}
