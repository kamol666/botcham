import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Plan } from 'src/shared/database/models/plans.model';
import { PaymentProvider, PaymentTypes, Transaction, TransactionStatus } from 'src/shared/database/models/transactions.model';
import { CardType, UserCardsModel } from 'src/shared/database/models/user-cards.model';
import { UserSubscription } from 'src/shared/database/models/user-subscription.model';
import { clickAuthHash } from 'src/shared/utils/hashing/click-auth-hash';
import logger from 'src/shared/utils/logger';
import { PaymentCardTokenDto } from 'src/shared/utils/types/interfaces/payme-types';
import { CreateCardTokenDto } from './dto/create-card-dto';
import { VerifyCardTokenDto } from './dto/verif-card-dto';
import { CreateCardTokenResponseDto } from 'src/shared/utils/types/interfaces/click-types-interface';
import { UserModel } from 'src/shared/database/models/user.model';
import { BotService } from 'src/modules/bot/bot.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClickSubsApiService {

    private readonly serviceId = process.env.CLICK_SERVICE_ID;
    private readonly baseUrl = 'https://api.click.uz/v2/merchant';
    private botService: BotService;

    constructor(private configService: ConfigService) { }

    getBotService(): BotService {
        if (!this.botService) {
            this.botService = new BotService();
        }
        return this.botService;
    }


    async createCardtoken(requestBody: CreateCardTokenDto) {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Auth': clickAuthHash()
        };

        interface RequestBody {
            service_id: number,
            card_number: string,
            expire_date: string,
            temporary: boolean,
        }

        if (!this.serviceId) {
            throw new Error('Service ID is not defined');
        }
        const requestBodyWithServiceId: RequestBody = {
            service_id: parseInt(this.serviceId!),
            card_number: requestBody.card_number,
            expire_date: requestBody.expire_date,
            temporary: requestBody.temporary
        };

        try {
            console.log("Request data:", requestBodyWithServiceId);

            // Karta raqamini formatlash - faqat raqamlar qoldirish
            const cleanCardNumber = requestBody.card_number.replace(/\D/g, '');

            // Karta raqami uzunligini tekshirish
            if (cleanCardNumber.length < 16 || cleanCardNumber.length > 19) {
                throw new Error(`Noto'g'ri karta raqami uzunligi: ${cleanCardNumber.length}. 16-19 raqam bo'lishi kerak.`);
            }

            // Expire date formatini tekshirish (MMYY yoki MMYYYY)
            const expireDate = requestBody.expire_date.replace(/\D/g, '');
            if (expireDate.length !== 4 && expireDate.length !== 6) {
                throw new Error(`Noto'g'ri expire_date formati: ${requestBody.expire_date}. MMYY yoki MMYYYY formatida bo'lishi kerak.`);
            }

            // Karta raqamidan oxirgi 4 ta raqamni telefon sifatida ishlatamiz
            const cardLastFour = cleanCardNumber.slice(-4);
            const userPhone = `998901234${cardLastFour}`; // Fake phone with card last 4 digits

            // To'g'rilangan request data
            const cleanedRequest = {
                ...requestBodyWithServiceId,
                card_number: cleanCardNumber,
                expire_date: expireDate.length === 4 ? expireDate : expireDate.substring(0, 4) // MMYY formatga o'tkazish
            };

            console.log("Cleaned request data:", cleanedRequest);

            // Retry mexanizmi bilan API ga murojaat qilish
            let response;
            let lastError;
            const maxRetries = 3;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`Click API ga murojaat qilish, urinish ${attempt}/${maxRetries}`);

                    response = await axios.post(
                        `${this.baseUrl}/card_token/request`,
                        cleanedRequest,
                        {
                            headers,
                            timeout: 45000, // 45 soniya timeout
                        }
                    );

                    console.log(`Muvaffaqiyatli javob olindi, urinish ${attempt}`);
                    break; // Muvaffaqiyatli bo'lsa, loopdan chiqamiz

                } catch (error) {
                    lastError = error;
                    console.error(`Click API xatosi, urinish ${attempt}/${maxRetries}:`, error.message);

                    // Agar oxirgi urinish bo'lmasa, kutamiz va qaytadan harakat qilamiz
                    if (attempt < maxRetries) {
                        const waitTime = attempt * 2000; // 2s, 4s kutish
                        console.log(`${waitTime}ms kutib, qaytadan harakat qilish...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            }

            if (!response) {
                console.error('Barcha urinishlar muvaffaqiyatsiz tugadi');
                throw lastError || new Error('Click API bilan aloqa o\'rnatib bo\'lmadi');
            }

            console.log("Received response data:", response.data);

            if (response.data.error_code !== 0) {
                const errorMessage = this.getClickErrorMessage(response.data.error_code);
                console.error(`Click API xatosi: ${response.data.error_code} - ${errorMessage}`);
                throw new Error(`Click API xatosi: ${errorMessage} (Kod: ${response.data.error_code})`);
            }

            const result: CreateCardTokenResponseDto = new CreateCardTokenResponseDto();
            result.token = response.data.card_token;
            result.incompletePhoneNumber = response.data.phone_number;

            // Click API dan kelgan haqiqiy telefon raqamini ishlatamiz
            const realUserPhone = response.data.phone_number || userPhone; // fallback sifatida fake phone
            console.log("Haqiqiy foydalanuvchi telefoni:", realUserPhone);

            // Redirect URL yaratish (haqiqiy telefon raqami bilan)
            const baseUrl = this.configService.get('BASE_URL') || 'http://localhost:3000';
            result.redirect_url = `${baseUrl}/api/click-subs-api/verify-sms?token=${response.data.card_token}&userId=${requestBody.userId}&planId=${requestBody.planId}&selectedService=${requestBody.selectedService}&phone=${encodeURIComponent(realUserPhone)}`;

            return result;
        } catch (error) {
            console.error('Error creating card token:', error);
            if (error.response?.data) {
                console.error('API response error:', error.response.data);
            }
            throw error;
        }
    }

    // Click xatolik kodlarini decode qilish
    private getClickErrorMessage(errorCode: number): string {
        const errorMessages = {
            [-1]: 'Noma\'lum xatolik',
            [-2]: 'Xizmat vaqtincha ishlamaydi',
            [-3]: 'Noto\'g\'ri so\'rov',
            [-4]: 'Noto\'g\'ri autentifikatsiya',
            [-5]: 'Yetarli mablag\' yo\'q',
            [-6]: 'Karta bloklangan',
            [-7]: 'Karta muddati tugagan',
            [-8]: 'Noto\'g\'ri PIN kod',
            [-9]: 'Tranzaksiya bekor qilindi',
            [-10]: 'Karta topilmadi',
            [-11]: 'Noto\'g\'ri karta ma\'lumotlari',
            [-400]: 'Noma\'lum karta turi yoki noto\'g\'ri format',
            [-401]: 'Autentifikatsiya xatosi',
            [-403]: 'Ruxsat berilmagan',
            [-404]: 'Xizmat topilmadi',
            [-500]: 'Server ichki xatosi',
            [-1905]: 'Ta\'minotchidan javob yo\'q (timeout xatosi)',
            [-1906]: 'Tarmoq aloqa xatosi',
            [-1907]: 'Bank tizimi vaqtincha ishlamaydi'
        };

        return errorMessages[errorCode] || `Noma'lum xatolik kodi: ${errorCode}`;
    }

    async verifyCardToken(requestBody: VerifyCardTokenDto) {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Auth': clickAuthHash()
        };

        interface RequestBody {

            service_id: number
            card_token: string,
            sms_code: number,
        }

        if (!this.serviceId) {
            throw new Error('Service ID is not defined');
        }

        const requestBodyWithServiceId: RequestBody = {
            service_id: parseInt(this.serviceId!),
            card_token: requestBody.card_token,
            sms_code: requestBody.sms_code
        };


        try {
            // Retry mexanizmi bilan SMS verification
            let response;
            let lastError;
            const maxRetries = 3;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`Click SMS verification, urinish ${attempt}/${maxRetries}`);

                    response = await axios.post(
                        `${this.baseUrl}/card_token/verify`,
                        requestBodyWithServiceId,
                        {
                            headers,
                            timeout: 45000, // 45 soniya timeout
                        }
                    );

                    console.log(`SMS verification muvaffaqiyatli, urinish ${attempt}`);
                    break;

                } catch (error) {
                    lastError = error;
                    console.error(`SMS verification xatosi, urinish ${attempt}/${maxRetries}:`, error.message);

                    // Agar oxirgi urinish bo'lmasa, kutamiz
                    if (attempt < maxRetries) {
                        const waitTime = attempt * 2000; // 2s, 4s kutish
                        console.log(`${waitTime}ms kutib, qaytadan harakat qilish...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            }

            if (!response) {
                console.error('SMS verification barcha urinishlar muvaffaqiyatsiz');
                throw lastError || new Error('Click SMS verification xatosi');
            }


            if (response.data.error_code !== 0) {
                throw new Error(`Verification failed: ${response.data.error_message || 'Unknown error'}`);
            }

            const user = await UserModel.findOne({
                _id: requestBody.userId,
            });


            if (!user) {
                logger.error(`User not found for ID: ${requestBody.userId}`);
                throw new Error('User not found');
            }
            logger.info(`User found: ${user}`);


            const plan = await Plan.findOne({
                _id: requestBody.planId
            });
            if (!plan) {
                logger.error(`Plan not found for ID: ${requestBody.planId}`);
                throw new Error('Plan not found');
            }

            console.log(plan)

            const alreadyHadFreeBonus = !!user.hasReceivedFreeBonus;


            const time = new Date().getTime();
            logger.info(`Creating user card for user ID: ${requestBody.userId}, with card token: ${requestBody.card_token}`);

            // Check if user card already exists with this incomplete card number
            const existingCard = await UserCardsModel.findOne({
                incompleteCardNumber: response.data.card_number
            });

            let userCard;
            if (existingCard) {
                // Update existing card
                logger.info(`Updating existing card for incomplete number: ${response.data.card_number}`);
                userCard = await UserCardsModel.findByIdAndUpdate(
                    existingCard._id,
                    {
                        cardToken: requestBodyWithServiceId.card_token,
                        expireDate: requestBody.expireDate,
                        verificationCode: requestBody.sms_code,
                        verified: true,
                        verifiedDate: new Date(time),
                        userId: requestBody.userId,
                        planId: requestBody.planId
                    },
                    { new: true }
                );
            } else {
                // Create new card
                logger.info(`Creating new card for incomplete number: ${response.data.card_number}`);
                userCard = await UserCardsModel.create({
                    telegramId: user.telegramId,
                    username: user.username ? user.username : undefined,
                    incompleteCardNumber: response.data.card_number,
                    cardToken: requestBodyWithServiceId.card_token,
                    expireDate: requestBody.expireDate,
                    userId: requestBody.userId,
                    planId: requestBody.planId,
                    verificationCode: requestBody.sms_code,
                    verified: true,
                    verifiedDate: new Date(time),
                    cardType: CardType.CLICK
                });
            }
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);

            await UserSubscription.create({
                user: requestBody.userId,
                plan: requestBody.planId,
                telegramId: user.telegramId,
                planName: plan.name,
                subscriptionType: 'subscription',
                startDate: new Date(),
                endDate: endDate,
                isActive: true,
                autoRenew: true,
                status: 'active',
                paidAmount: plan.price,
                paidBy: CardType.CLICK,
                subscribedBy: CardType.CLICK,
                hasReceivedFreeBonus: true
            });
            const successResult = response.data;
            user.subscriptionType = 'subscription';
            if (!alreadyHadFreeBonus) {
                user.hasReceivedFreeBonus = true;
            }
            await user.save();

            if (!alreadyHadFreeBonus) {
                logger.info(`Free Click trial activated for user ${requestBody.userId}; skipping immediate charge.`);

                if (requestBody.selectedService === 'yulduz') {
                    await this.getBotService().handleAutoSubscriptionSuccess(
                        requestBody.userId,
                        user.telegramId,
                        requestBody.planId,
                        user.username
                    );
                }

                return { ...successResult, success: true, trial: true };
            }

            const chargeResult = await this.chargeCard(
                userCard.cardToken,
                plan.price,
                requestBody.planId,
                requestBody.userId,
            );

            if (!chargeResult.success) {
                logger.error(`Click charge failed for user ${requestBody.userId}; removing temporary subscription record.`);
                await UserSubscription.deleteOne({ user: requestBody.userId, plan: requestBody.planId });
                return { success: false };
            }

            return { success: true };
        } catch (error) {
            console.error('Error verifying card token:', error);
            throw error;
        }


    }


    async paymentWithToken(requestBody: PaymentCardTokenDto) {
        const userCard = await UserCardsModel.findOne({
            userId: requestBody.userId,
            telegramId: requestBody.telegramId,
            verified: true
        });

        if (!userCard || !this.serviceId) {
            return { success: false };
        }

        if (userCard.cardType !== CardType.CLICK) {
            logger.error(`Card type is not CLICK for User ID: ${requestBody.userId}`);
            return {
                success: false,
            }
        }

        const plan = await Plan.findById(requestBody.planId);
        if (!plan) {
            logger.error('Plan not found');
            return {
                success: false,
            }
        }

        const headers = this.getHeaders();

        const payload = {
            service_id: this.serviceId,
            card_token: userCard.cardToken,
            amount: plan.price.toString(),
            transaction_parameter: plan._id.toString(),
            transaction_param3: requestBody.userId,
            transaction_param4: 'merchant',
        };

        try {
            const response = await axios.post(
                `${this.baseUrl}/card_token/payment`,
                payload,
                { headers });


            const { error_code } = response.data;

            logger.error(`Error code from response: ${error_code}`);

            if (error_code === -5017) {
                // Handle insufficient funds case
                logger.error(`Insufficient funds for user ID: ${requestBody.userId}`);
                return { success: false };
            }

            const paymentId = response.data.payment_id;

            const customRandomId = `subscription-click-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;


            const transaction = await Transaction.create(
                {
                    provider: PaymentProvider.CLICK,
                    paymentType: PaymentTypes.SUBSCRIPTION,
                    transId: paymentId ? paymentId : customRandomId,
                    amount: '5555',
                    status: TransactionStatus.PAID,
                    userId: requestBody.userId,
                    planId: requestBody.planId,
                }
            )

            logger.info(`Transaction created in click-subs-api: ${JSON.stringify(transaction)}`);


            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);

            await UserSubscription.create({
                user: requestBody.userId,
                plan: requestBody.planId,
                telegramId: requestBody.telegramId,
                planName: plan.name,
                subscriptionType: 'subscription',
                startDate: new Date(),
                endDate: endDate,
                isActive: true,
                autoRenew: true,
                status: 'active',
                paidBy: CardType.CLICK,
                subscribedBy: CardType.CLICK,
                hasReceivedFreeBonus: true
            });

            logger.info(`UserSubscription created for user ID: ${requestBody.userId}, telegram ID: ${requestBody.telegramId}, plan ID: ${requestBody.planId} in click-subs-api`);


            // Charge the card for the subscription
            const chargeResult = await this.chargeCard(userCard.cardToken, plan.price, requestBody.planId, requestBody.userId);
            if (!chargeResult.success) {
                logger.error('Failed to charge card for subscription');
                // Optionally, delete the created subscription
                await UserSubscription.deleteOne({ user: requestBody.userId, plan: requestBody.planId });
                throw new Error('Payment failed');
            }

            return { success: true };

        } catch {
            return { success: false };
        }


    }

    async chargeCard(cardToken: string, amount: number, planId: string, userId: string) {
        const headers = this.getHeaders();

        const requestBody = {
            service_id: parseInt(this.serviceId!),
            card_token: cardToken,
            amount: amount,
            transaction_parameter: planId,
        };

        try {
            const response = await axios.post(
                `${this.baseUrl}/card_token/payment`,
                requestBody,
                { headers }
            );

            const { error_code, error_note } = response.data;

            if (error_code !== 0) {
                logger.error(
                    `Click charge rejected for user ${userId}: code=${error_code}, note=${error_note}`,
                );
                return { success: false, error_code, error_note };
            }

            // Create transaction record
            const transId = response.data.click_trans_id;
            await Transaction.create({
                provider: PaymentProvider.CLICK,
                paymentType: PaymentTypes.ONETIME, // or subscription
                planId,
                userId,
                transId,
                status: TransactionStatus.PAID,
                amount,
                createdAt: new Date(),
            });

            return { success: true, transId };
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                logger.error(
                    'Error charging card (response):',
                    error.response.status,
                    error.response.data,
                );
            } else {
                logger.error('Error charging card:', error);
            }
            return { success: false };
        }
    }

    private getHeaders() {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Auth': clickAuthHash()
        };
    }

}
