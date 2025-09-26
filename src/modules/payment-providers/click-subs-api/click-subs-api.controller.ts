import { Controller, Get, Post, Body, Patch, Param, Delete, Header, Render, Query } from '@nestjs/common';
import { ClickSubsApiService } from './click-subs-api.service';
import { CreateCardTokenResponseDto } from 'src/shared/utils/types/interfaces/click-types-interface';
import { CreateCardTokenDto } from './dto/create-card-dto';
import { VerifyCardTokenDto } from './dto/verif-card-dto';

@Controller('click-subs-api')
export class ClickSubsApiController {
  constructor(private readonly clickSubsApiService: ClickSubsApiService) { }

  @Get('/card-form')
  @Header('Content-Type', 'text/html')
  @Render('click/payment-card-insert')
  renderCardFormPage(
    @Query('userId') userId: string,
    @Query('planId') planId: string,
    @Query('selectedService') selectedService: string
  ) {
    return {
      userId,
      planId,
      selectedService
    };
  }

  @Get('/payment')
  @Header('Content-Type', 'text/html')
  @Render('click/payment-card-insert')
  renderPaymentPage(
    @Query('userId') userId: string,
    @Query('planId') planId: string,
    @Query('selectedService') selectedService: string
    // @Query('telegramId') telegramId: number
  ) {
    return {
      userId,
      planId,
      selectedService
    };
  }
  @Get('/verify-sms')
  @Render('click/sms-code-confirm')
  renderSmsVerificationPage(
    @Query('token') token: string,
    @Query('phone') phone: string,
    @Query('userId') userId: string,
    @Query('planId') planId: string,
    @Query('selectedService') selectedService: string
  ) {
    return {
      token,
      phone,
      userId,
      planId,
      selectedService
    };
  }


  @Post('/create-card-token')
  async createCardToken(@Body() requestBody: CreateCardTokenDto): Promise<CreateCardTokenResponseDto> {
    try {
      console.log('Create card token request:', {
        card_number: requestBody.card_number?.substring(0, 6) + '******',
        expire_date: requestBody.expire_date
      });

      return await this.clickSubsApiService.createCardtoken(requestBody);
    } catch (error) {
      console.error('Controller error in createCardToken:', error.message);
      throw error;
    }
  }

  @Post('/verify-card-token/')
  async verifyCardToken(@Body() requestBody: VerifyCardTokenDto) {
    try {
      console.log('Verify card token request for token:', requestBody.card_token?.substring(0, 10) + '...');
      return await this.clickSubsApiService.verifyCardToken(requestBody);
    } catch (error) {
      console.error('Controller error in verifyCardToken:', error.message);
      throw error;
    }
  }

}
