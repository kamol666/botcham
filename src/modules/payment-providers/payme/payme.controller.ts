import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymeService } from './payme.service';
import { RequestBody } from './types/incoming-request-body';
import { PaymeBasicAuthGuard } from './auth/guards/payme.guard';
import logger from '../../../shared/utils/logger';

@Controller('payme')
export class PaymeController {
  constructor(private readonly paymeService: PaymeService) {}

  @Post()
  @UseGuards(PaymeBasicAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleTransactionMethods(@Body() reqBody: RequestBody) {
    logger.info(
      `🔥 Payme webhook called! Method: ${reqBody.method}`,
    );
    logger.info(
      `🔥 Full Payme request body: ${JSON.stringify(reqBody, null, 2)}`,
    );
    return await this.paymeService.handleTransactionMethods(reqBody);
  }
}
