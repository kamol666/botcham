import { Controller, Post, Body, Get, Query, Res, HttpStatus, Param } from '@nestjs/common';
import { Response } from 'express';
import { ClickShopService } from './click-shop.service';

@Controller('click-shop')
export class ClickShopController {
    constructor(private readonly clickShopService: ClickShopService) { }

    // Payment session yaratish (API endpoint)
    @Post('create-payment-session')
    async createPaymentSession(@Body() createPaymentDto: any) {
        try {
            const result = await this.clickShopService.createPaymentSession(createPaymentDto);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Click callback (Prepare va Complete)
    @Post('callback')
    async handleCallback(@Body() callbackDto: any) {
        return this.clickShopService.handleCallback(callbackDto);
    }

    // To'lov muvaffaqiyatli tugagandan keyingi sahifa
    @Get('success')
    async handleSuccess(@Query() query: any, @Res() res: Response) {
        const { merchant_trans_id, click_trans_id } = query;

        // To'lov holatini tekshirish
        const transaction = await this.clickShopService.getTransactionByMerchantId(merchant_trans_id);

        if (transaction && transaction.status === 'paid') {
            // Muvaffaqiyatli to'lov sahifasiga yo'naltirish
            return res.redirect(`https://t.me/munajjimlarbashorati_bot?start=payment_success_${transaction._id}`);
        } else {
            // Xatolik sahifasiga yo'naltirish
            return res.redirect(`https://t.me/munajjimlarbashorati_bot?start=payment_failed`);
        }
    }

    // To'lov holatini tekshirish
    @Get('status/:transactionId')
    async checkStatus(@Param('transactionId') transactionId: string) {
        return this.clickShopService.checkPaymentStatus(transactionId);
    }

    // Xavfsiz payment session yaratish (bot uchun)
    @Get('create-payment-redirect')
    async createPaymentAndRedirect(@Query() query: any, @Res() res: Response) {
        try {
            const { userId, planId, selectedService } = query;

            // Xavfsiz payment session yaratish
            const result = await this.clickShopService.createPaymentSession({
                userId,
                planId,
                selectedService
            });

            if (result.redirect_url) {
                // Xavfsiz URL ga yo'naltirish
                return res.redirect(result.redirect_url);
            } else {
                throw new Error('To\'lov URL yaratilmadi');
            }
        } catch (error) {
            // Xatolik bo'lsa, bot'ga qaytarish
            return res.redirect(`https://t.me/munajjimlarbashorati_bot?start=payment_error`);
        }
    }

    // Session orqali to'lov yaratish
    @Get('initiate-payment/:sessionToken')
    async initiatePayment(@Param('sessionToken') sessionToken: string, @Res() res: Response) {
        try {
            // Session tekshirib to'lov yaratish
            const result = await this.clickShopService.createPaymentFromSession(sessionToken);

            if (result.payment_url) {
                // Click to'lov sahifasiga yo'naltirish
                return res.redirect(result.payment_url);
            } else {
                throw new Error('To\'lov URL yaratilmadi');
            }
        } catch (error) {
            // Xatolik bo'lsa, bot'ga qaytarish
            return res.redirect(`https://t.me/munajjimlarbashorati_bot?start=payment_error`);
        }
    }
}
