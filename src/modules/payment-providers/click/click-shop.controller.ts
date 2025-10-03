import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ClickShopService } from './click-shop.service';

@Controller('click-shop')
export class ClickShopController {
  constructor(private readonly clickShopService: ClickShopService) { }

  @Post('create-payment-session')
  async createPaymentSession(@Body() createPaymentDto: any) {
    try {
      const result = await this.clickShopService.createPaymentSession(createPaymentDto);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('create-payment-redirect')
  async createPaymentAndRedirect(@Query() query: any, @Res() res: Response) {
    try {
      const { userId, planId, selectedService } = query;

      // To'g'ridan-to'g'ri Click linkini generatsiya qilish
      const result = await this.clickShopService.createDirectPaymentLink({
        userId,
        planId,
        selectedService
      });

      return res.redirect(result.payment_url);
    } catch (error) {
      console.error('Payment redirect error:', error);
      return res.redirect(`https://t.me/n17kamolBot?start=payment_error`);
    }
  }

  @Get('initiate-payment/:sessionToken')
  async initiatePayment(@Param('sessionToken') sessionToken: string, @Res() res: Response) {
    try {
      const result = await this.clickShopService.createPaymentFromSession(sessionToken);
      return res.redirect(result.payment_url);
    } catch (error) {
      console.error('Click payment initiation error:', error);
      return res.redirect(`https://t.me/n17kamolBot?start=payment_error`);
    }
  }
}
