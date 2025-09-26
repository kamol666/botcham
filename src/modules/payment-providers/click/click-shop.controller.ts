import { Controller, Post, Body, Get, Query, Res, HttpStatus, Param } from '@nestjs/common';
import { Response } from 'express';
import { ClickShopService } from './click-shop.service';

@Controller('click-shop')
export class ClickShopController {
    constructor(private readonly clickShopService: ClickShopService) { }

    // Bir martalik to'lov yaratish
    @Post('create-payment')
    async createPayment(@Body() createPaymentDto: any) {
        try {
            const result = await this.clickShopService.createPayment(createPaymentDto);
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

    // To'lovni yaratish va yo'naltirish (bot uchun)
    @Get('create-payment-redirect')
    async createPaymentAndRedirect(@Query() query: any, @Res() res: Response) {
        try {
            const { userId, planId, selectedService, amount } = query;

            // To'lov yaratish
            const result = await this.clickShopService.createPayment({
                userId,
                planId,
                selectedService,
                amount: parseInt(amount)
            });

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
