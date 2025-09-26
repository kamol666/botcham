import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Transaction, TransactionStatus } from '../../../shared/database/models/transactions.model';
import { BotService } from '../../bot/bot.service';
import { UserModel } from '../../../shared/database/models/user.model';
import { Plan } from '../../../shared/database/models/plans.model';
import { PaymentSession } from '../../../shared/database/models/payment-session.model';

@Injectable()
export class ClickShopService {
    private readonly logger = new Logger(ClickShopService.name);
    private readonly secretKey: string;
    private readonly serviceId: string;
    private readonly merchantId: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly botService: BotService,
    ) {
        this.secretKey = this.configService.get<string>('CLICK_SECRET');
        this.serviceId = this.configService.get<string>('CLICK_SERVICE_ID');
        this.merchantId = this.configService.get<string>('CLICK_MERCHANT_ID');
    }

    // Xavfsiz payment session yaratish
    async createPaymentSession(createPaymentDto: any) {
        try {
            this.logger.log('Payment session yaratish:', {
                userId: createPaymentDto.userId,
                planId: createPaymentDto.planId,
                provider: 'click-shop'
            });

            // Plan ma'lumotlarini olish
            const plan = await Plan.findById(createPaymentDto.planId);
            if (!plan) {
                throw new Error('Plan topilmadi');
            }

            // Xavfsiz session token yaratish
            const sessionToken = this.generateSecureToken();

            // Payment session yaratish (15 daqiqa amal qiladi)
            const paymentSession = new PaymentSession({
                sessionToken,
                userId: createPaymentDto.userId,
                planId: createPaymentDto.planId,
                selectedService: createPaymentDto.selectedService,
                amount: plan.price,
                provider: 'click-shop',
                status: 'pending',
                expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 daqiqa
            });

            await paymentSession.save();

            // Faqat session token bilan URL yaratish
            const redirectUrl = `${this.configService.get('BASE_URL')}/api/click-shop/initiate-payment/${sessionToken}`;

            return {
                redirect_url: redirectUrl,
                session_token: sessionToken,
                expires_at: paymentSession.expiresAt
            };

        } catch (error) {
            this.logger.error('Payment session yaratishda xatolik:', error);
            throw error;
        }
    }

    // Session orqali to'lov yaratish
    async createPaymentFromSession(sessionToken: string) {
        try {
            // Session tekshirish
            const session = await PaymentSession.findOne({
                sessionToken,
                status: 'pending',
                expiresAt: { $gt: new Date() }
            });

            if (!session) {
                throw new Error('Session topilmadi yoki muddati tugagan');
            }

            // Plan ma'lumotlarini olish
            const plan = await Plan.findById(session.planId);
            if (!plan) {
                throw new Error('Plan topilmadi');
            }

            // Transaction yaratish
            const merchantTransId = this.generateMerchantTransId();

            const transaction = new Transaction({
                userId: session.userId,
                planId: session.planId,
                selectedService: session.selectedService,
                amount: session.amount,
                currency: 'UZS',
                provider: 'click-shop',
                status: TransactionStatus.PENDING,
                transId: merchantTransId,
                metadata: {
                    merchant_trans_id: merchantTransId,
                    plan_name: plan.name,
                    plan_duration: plan.duration,
                    session_token: sessionToken
                }
            });

            await transaction.save();
            this.logger.log('Transaction yaratildi:', transaction._id);

            // Session ishlatilgan deb belgilash
            session.status = 'used';
            await session.save();

            // Click SHOP-API URL yaratish
            const paymentUrl = this.generateClickUrl({
                merchant_id: this.merchantId,
                service_id: this.serviceId,
                transaction_param: merchantTransId,
                amount: session.amount,
                return_url: `${this.configService.get('BASE_URL')}/api/click-shop/success`,
                merchant_user_id: session.userId,
            });

            return {
                payment_url: paymentUrl,
                transaction_id: transaction._id,
                merchant_trans_id: merchantTransId,
                amount: session.amount
            };

        } catch (error) {
            this.logger.error('Session dan to\'lov yaratishda xatolik:', error);
            throw error;
        }
    }

    // Click URL yaratish (SHOP-API format)
    private generateClickUrl(params: any): string {
        const baseUrl = 'https://my.click.uz/services/pay';
        const queryParams = new URLSearchParams({
            merchant_id: params.merchant_id,
            service_id: params.service_id,
            transaction_param: params.transaction_param,
            amount: params.amount.toString(),
            return_url: params.return_url,
            merchant_user_id: params.merchant_user_id,
        });

        return `${baseUrl}?${queryParams.toString()}`;
    }

    // Callback handle qilish (Prepare va Complete)
    async handleCallback(callbackDto: any) {
        try {
            this.logger.log('Click SHOP callback:', callbackDto);

            const {
                click_trans_id,
                service_id,
                merchant_trans_id,
                amount,
                action,
                error,
                sign_string,
                sign_time,
                merchant_prepare_id
            } = callbackDto;

            // Sign tekshirish
            if (!this.verifySignature(callbackDto)) {
                this.logger.error('Invalid signature');
                return {
                    click_trans_id,
                    merchant_trans_id,
                    error: -1,
                    error_note: 'Invalid signature'
                };
            }

            // Transaction topish
            const transaction = await Transaction.findOne({
                transId: merchant_trans_id
            });

            if (!transaction) {
                this.logger.error('Transaction topilmadi:', merchant_trans_id);
                return {
                    click_trans_id,
                    merchant_trans_id,
                    error: -5,
                    error_note: 'Transaction not found'
                };
            }

            if (action === 0) {
                // PREPARE stage
                return await this.handlePrepare(callbackDto, transaction);
            } else if (action === 1) {
                // COMPLETE stage
                return await this.handleComplete(callbackDto, transaction);
            }

        } catch (error) {
            this.logger.error('Callback xatosi:', error);
            return {
                click_trans_id: callbackDto.click_trans_id || 0,
                merchant_trans_id: callbackDto.merchant_trans_id || '',
                error: -8,
                error_note: 'Internal error'
            };
        }
    }

    // PREPARE stage (Click documentation bo'yicha)
    private async handlePrepare(callbackDto: any, transaction: any) {
        this.logger.log('PREPARE stage:', callbackDto);

        // Agar to'lov allaqachon amalga oshirilgan bo'lsa
        if (transaction.status === TransactionStatus.PAID) {
            return {
                click_trans_id: callbackDto.click_trans_id,
                merchant_trans_id: callbackDto.merchant_trans_id,
                merchant_prepare_id: transaction._id,
                error: -4,
                error_note: 'Already paid'
            };
        }

        // Summa tekshirish
        if (parseFloat(callbackDto.amount) !== transaction.amount) {
            return {
                click_trans_id: callbackDto.click_trans_id,
                merchant_trans_id: callbackDto.merchant_trans_id,
                error: -2,
                error_note: 'Incorrect amount'
            };
        }

        // Transaction tayyorlash
        transaction.clickTransId = callbackDto.click_trans_id;
        transaction.status = TransactionStatus.CREATED;
        await transaction.save();

        this.logger.log('PREPARE muvaffaqiyatli:', transaction._id);

        return {
            click_trans_id: callbackDto.click_trans_id,
            merchant_trans_id: callbackDto.merchant_trans_id,
            merchant_prepare_id: transaction._id.toString(),
            error: 0,
            error_note: 'Success'
        };
    }

    // COMPLETE stage (Click documentation bo'yicha)
    private async handleComplete(callbackDto: any, transaction: any) {
        this.logger.log('COMPLETE stage:', callbackDto);

        if (callbackDto.error < 0) {
            // To'lov Click tomonidan bekor qilindi
            transaction.status = TransactionStatus.FAILED;
            transaction.errorNote = callbackDto.error_note;
            await transaction.save();

            this.logger.log('To\'lov bekor qilindi:', transaction._id);

            return {
                click_trans_id: callbackDto.click_trans_id,
                merchant_trans_id: callbackDto.merchant_trans_id,
                merchant_confirm_id: transaction._id.toString(),
                error: -9,
                error_note: 'Cancelled'
            };
        }

        if (transaction.status === TransactionStatus.PAID) {
            return {
                click_trans_id: callbackDto.click_trans_id,
                merchant_trans_id: callbackDto.merchant_trans_id,
                merchant_confirm_id: transaction._id.toString(),
                error: -4,
                error_note: 'Already confirmed'
            };
        }

        // To'lov muvaffaqiyatli
        transaction.status = TransactionStatus.PAID;
        await transaction.save();

        this.logger.log('To\'lov muvaffaqiyatli:', transaction._id);

        // Foydalanuvchini obuna qilish
        try {
            const user = await UserModel.findById(transaction.userId);
            if (user) {
                await this.botService.handlePaymentSuccess(
                    transaction.userId.toString(),
                    user.telegramId,
                    user.username,
                );
                this.logger.log('Foydalanuvchi obuna qilindi:', user.telegramId);
            }
        } catch (error) {
            this.logger.error('Obuna qilishda xatolik:', error);
            // To'lov muvaffaqiyatli, lekin obuna qilishda xatolik
            // Bu yerda qo'shimcha monitoring qo'shish kerak
        }

        return {
            click_trans_id: callbackDto.click_trans_id,
            merchant_trans_id: callbackDto.merchant_trans_id,
            merchant_confirm_id: transaction._id.toString(),
            error: 0,
            error_note: 'Success'
        };
    }

    // Signature tekshirish (Click documentation bo'yicha)
    private verifySignature(callbackDto: any): boolean {
        const {
            click_trans_id,
            service_id,
            merchant_trans_id,
            merchant_prepare_id = '',
            amount,
            action,
            sign_time,
            sign_string
        } = callbackDto;

        let dataString;
        if (action === 0) {
            // Prepare uchun
            dataString = `${click_trans_id}${service_id}${this.secretKey}${merchant_trans_id}${amount}${action}${sign_time}`;
        } else {
            // Complete uchun
            dataString = `${click_trans_id}${service_id}${this.secretKey}${merchant_trans_id}${merchant_prepare_id}${amount}${action}${sign_time}`;
        }

        const hash = crypto.createHash('md5').update(dataString).digest('hex');

        this.logger.log('Signature verification:', {
            expected: hash,
            received: sign_string,
            dataString: dataString
        });

        return hash === sign_string;
    }

    // Transaction ID generatsiya qilish
    private generateMerchantTransId(): string {
        return `shop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Xavfsiz token generatsiya qilish
    private generateSecureToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    // Transaction topish
    async getTransactionByMerchantId(merchantTransId: string) {
        return Transaction.findOne({ transId: merchantTransId });
    }

    // To'lov holatini tekshirish
    async checkPaymentStatus(transactionId: string) {
        try {
            const transaction = await Transaction.findById(transactionId);
            if (!transaction) {
                return { success: false, error: 'Transaction not found' };
            }

            return {
                success: true,
                data: {
                    status: transaction.status,
                    amount: transaction.amount,
                    paid_at: transaction.updatedAt,
                    provider: transaction.provider
                }
            };
        } catch (error) {
            this.logger.error('Status tekshirishda xatolik:', error);
            return { success: false, error: error.message };
        }
    }
}
