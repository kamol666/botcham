import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickRequest } from './types/click-request.type';
import { ClickAction, ClickError } from './enums';
import logger from '../../../shared/utils/logger';
import { generateMD5 } from '../../../shared/utils/hashing/hasher.helper';
import {
  PaymentProvider,
  PaymentTypes,
  Transaction,
  TransactionStatus,
} from '../../../shared/database/models/transactions.model';
import { UserModel } from '../../../shared/database/models/user.model';
import { BotService } from '../../bot/bot.service';
import { Plan } from '../../../shared/database/models/plans.model';
import axios from 'axios';
import { createHash } from 'node:crypto';

@Injectable()
export class ClickService {
  private readonly secretKey: string;
  private readonly serviceId: string;
  private readonly merchantId: string;
  private readonly merchantUserId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly botService: BotService,
  ) {
    const secretKey = this.configService.get<string>('CLICK_SECRET');
    if (!secretKey) {
      throw new Error('CLICK_SECRET is not defined in the configuration');
    }
    this.secretKey = secretKey;
    this.serviceId = this.configService.get<string>('CLICK_SERVICE_ID');
    this.merchantId = this.configService.get<string>('CLICK_MERCHANT_ID');
    this.merchantUserId = this.configService.get<string>('CLICK_MERCHANT_USER_ID');
  }

  // Helper metod: Oddiy MD5 hash yaratish
  private createSimpleMD5Hash(data: string): string {
    const hashFunc = createHash('md5');
    hashFunc.update(data);
    return hashFunc.digest('hex');
  }

  async handleMerchantTransactions(clickReqBody: ClickRequest) {
    const actionType = +clickReqBody.action;
    clickReqBody.amount = parseFloat(clickReqBody.amount + '');

    logger.info(
      `Handling merchant transaction with action type: ${actionType}`,
    );

    switch (actionType) {
      case ClickAction.Prepare:
        return this.prepare(clickReqBody);
      case ClickAction.Complete:
        return this.complete(clickReqBody);
      default:
        return {
          error: ClickError.ActionNotFound,
          error_note: 'Invalid action',
        };
    }
  }

  async prepare(clickReqBody: ClickRequest) {
    logger.info('Preparing transaction', { clickReqBody });

    const planId = clickReqBody.merchant_trans_id;
    const userId = clickReqBody.param2 || clickReqBody.param3;
    const selectedService = clickReqBody.param3 || 'yulduz';
    const amount = clickReqBody.amount;
    const transId = clickReqBody.click_trans_id + '';
    const signString = clickReqBody.sign_string;
    const signTime = new Date(clickReqBody.sign_time).toISOString();

    const myMD5Params = {
      clickTransId: transId,
      serviceId: clickReqBody.service_id,
      secretKey: this.secretKey,
      merchantTransId: planId,
      amount: amount,
      action: clickReqBody.action,
      signTime: clickReqBody.sign_time,
    };

    const myMD5Hash = generateMD5(myMD5Params);

    if (signString !== myMD5Hash) {
      logger.warn('Signature validation failed', { transId });
      return {
        error: ClickError.SignFailed,
        error_note: 'Invalid sign_string',
      };
    }

    // Check if the transaction already exists and is not in a PENDING state
    const existingTransaction = await Transaction.findOne({
      transId: transId,
      status: { $ne: TransactionStatus.PENDING },
    });

    if (existingTransaction) {
      return {
        error: ClickError.AlreadyPaid,
        error_note: 'Transaction already processed',
      };
    }

    // Create a new transaction only if it doesn't exist or is in a PENDING state
    const time = new Date().getTime();
    await Transaction.create({
      provider: PaymentProvider.CLICK,
      paymentType: PaymentTypes.ONETIME,
      planId,
      userId,
      selectedService,
      signTime,
      transId,
      prepareId: time,
      status: TransactionStatus.PENDING,
      amount: clickReqBody.amount,
      createdAt: new Date(time),
    });

    return {
      click_trans_id: +transId,
      merchant_trans_id: planId,
      merchant_prepare_id: time,
      error: ClickError.Success,
      error_note: 'Success',
    };
  }

  async complete(clickReqBody: ClickRequest) {
    logger.info('Completing transaction', { clickReqBody });

    const planId = clickReqBody.merchant_trans_id;
    const userId = clickReqBody.param2 || clickReqBody.param3;
    const prepareId = clickReqBody.merchant_prepare_id;
    const transId = clickReqBody.click_trans_id + '';
    const serviceId = clickReqBody.service_id;
    const amount = clickReqBody.amount;
    const signTime = clickReqBody.sign_time;
    const error = clickReqBody.error;
    const signString = clickReqBody.sign_string;

    const myMD5Params = {
      clickTransId: transId,
      serviceId,
      secretKey: this.secretKey,
      merchantTransId: planId,
      merchantPrepareId: prepareId,
      amount,
      action: clickReqBody.action,
      signTime,
    };

    const myMD5Hash = generateMD5(myMD5Params);

    if (signString !== myMD5Hash) {
      return {
        error: ClickError.SignFailed,
        error_note: 'Invalid sign_string',
      };
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return {
        error: ClickError.UserNotFound,
        error_note: 'Invalid userId',
      };
    }

    const plan = await Plan.findById(planId);

    if (!plan) {
      return {
        error: ClickError.UserNotFound,
        error_note: 'Invalid planId',
      };
    }

    const isPrepared = await Transaction.findOne({
      prepareId,
      userId,
      planId,
    });

    if (!isPrepared) {
      return {
        error: ClickError.TransactionNotFound,
        error_note: 'Invalid merchant_prepare_id',
      };
    }

    const isAlreadyPaid = await Transaction.findOne({
      planId,
      prepareId,
      status: TransactionStatus.PAID,
    });

    if (isAlreadyPaid) {
      return {
        error: ClickError.AlreadyPaid,
        error_note: 'Already paid',
      };
    }

    // Amount tiyin da keladi, plan price so'mda. Tiyinni so'mga o'tkazamiz yoki plan priceni tiyinga
    // plan.price so'mda saqlanadi (masalan: 5555), amount tiyin da keladi (masalan: 555500)
    // Shuning uchun plan.price * 100 qilamiz
    const planPriceInTiyns = plan.price * 100;

    if (parseInt(`${amount}`) !== planPriceInTiyns) {
      logger.warn(`Amount mismatch: received ${amount} tiyin, expected ${planPriceInTiyns} tiyin (plan price: ${plan.price} so'm)`);
      return {
        error: ClickError.InvalidAmount,
        error_note: `Invalid amount. Expected: ${planPriceInTiyns} tiyin, received: ${amount} tiyin`,
      };
    }

    const transaction = await Transaction.findOne({
      transId,
    });

    if (transaction && transaction.status === TransactionStatus.CANCELED) {
      return {
        error: ClickError.TransactionCanceled,
        error_note: 'Already cancelled',
      };
    }

    if (error > 0) {
      await Transaction.findOneAndUpdate(
        { transId: transId },
        { status: TransactionStatus.FAILED },
      );
      return {
        error: error,
        error_note: 'Failed',
      };
    }

    await Transaction.findOneAndUpdate(
      { transId: transId },
      { status: TransactionStatus.PAID },
    );

    logger.info(`Transaction updated to PAID: ${transId}`);

    if (transaction) {
      try {
        const user = await UserModel.findById(transaction.userId).exec();
        logger.info(`User found for payment success: ${user ? 'Yes' : 'No'}, TelegramId: ${user?.telegramId}`);

        if (user) {
          await this.botService.handlePaymentSuccess(
            transaction.userId.toString(),
            user.telegramId,
            user.username,
            transaction.planId ? String(transaction.planId) : undefined,
            transaction.selectedService || 'yulduz',
          );
          logger.info(`Payment success handled for user: ${user.telegramId}`);
        }
      } catch (error) {
        logger.error('Error handling payment success:', error);
        // Continue with the response even if notification fails
      }
    }

    return {
      click_trans_id: +transId,
      merchant_trans_id: planId,
      error: ClickError.Success,
      error_note: 'Success',
    };
  }

  // Yangi metod: Click obunasini bekor qilish
  async cancelSubscription(contractId: string): Promise<boolean> {
    try {
      logger.info(`Click obunasini bekor qilish: ${contractId}`);

      // Click API uchun auth token yaratish
      const authUrl = 'https://api.click.uz/v2/merchant';
      const timestamp = Math.floor(Date.now() / 1000);

      // Auth uchun signature yaratish
      const signData = `${this.merchantUserId}${timestamp}${this.secretKey}`;
      const signature = this.createSimpleMD5Hash(signData);

      const authHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Auth': `${this.merchantUserId}:${signature}:${timestamp}`,
      };

      // Obunani bekor qilish so'rovi
      const cancelData = {
        service_id: parseInt(this.serviceId),
        contract_id: contractId,
        action: 'cancel_subscription',
      };

      const response = await axios.post(`${authUrl}/subscription/cancel`, cancelData, {
        headers: authHeaders,
        timeout: 30000,
      });

      if (response.data && response.data.error === 0) {
        logger.info(`Click obuna muvaffaqiyatli bekor qilindi: ${contractId}`);
        return true;
      } else {
        logger.error(`Click obuna bekor qilish xatosi: ${response.data?.error_note || 'Unknown error'}`);
        return false;
      }

    } catch (error) {
      const errorMessage = this.handleClickApiError(error, 'obuna bekor qilish');
      logger.error(`Click obuna bekor qilish xatosi: ${errorMessage}`);

      // Agar API ishlamasa, bazadagi statusni o'zgartiramiz
      try {
        await Transaction.findOneAndUpdate(
          { transId: contractId, provider: 'click' },
          { status: TransactionStatus.CANCELED },
        );
        logger.info(`Click obuna bazada bekor qilindi: ${contractId}`);
        return true;
      } catch (dbError) {
        logger.error(`Bazani yangilashda xatolik: ${dbError.message}`);
        return false;
      }
    }
  }

  // Click obunalarini olish (ixtiyoriy)
  async getActiveSubscriptions(): Promise<any[]> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signData = `${this.merchantUserId}${timestamp}${this.secretKey}`;
      const signature = this.createSimpleMD5Hash(signData);

      const authHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Auth': `${this.merchantUserId}:${signature}:${timestamp}`,
      };

      const response = await axios.get('https://api.click.uz/v2/merchant/subscription/list', {
        headers: authHeaders,
        params: { service_id: this.serviceId },
        timeout: 30000,
      });

      return response.data?.data || [];
    } catch (error) {
      const errorMessage = this.handleClickApiError(error, 'obunalar ro\'yxatini olish');
      logger.error(`Click obunalar ro'yxatini olish xatosi: ${errorMessage}`);
      return [];
    }
  }

  // Barcha faol Click obunalarini bekor qilish
  async cancelAllActiveSubscriptions(): Promise<{ success: number; failed: number }> {
    try {
      const activeSubscriptions = await this.getActiveSubscriptions();
      let successCount = 0;
      let failedCount = 0;

      for (const subscription of activeSubscriptions) {
        const success = await this.cancelSubscription(subscription.contract_id || subscription.id);
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
        // API rate limit uchun kichik pauza
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info(`Click obunalar: ${successCount} bekor qilindi, ${failedCount} xato`);
      return { success: successCount, failed: failedCount };
    } catch (error) {
      const errorMessage = this.handleClickApiError(error, 'barcha obunalarni bekor qilish');
      logger.error(`Barcha Click obunalarni bekor qilish xatosi: ${errorMessage}`);
      return { success: 0, failed: 0 };
    }
  }

  // Yangi metod: Click API xatoliklarini batafsil tekshirish
  private handleClickApiError(error: any, operation: string): string {
    logger.error(`Click API xatosi ${operation} jarayonida:`, error);

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'Tarmoq aloqa xatosi: Timeout (Server javob bermayapti)';
    }

    if (error.code === 'ECONNREFUSED') {
      return 'Tarmoq aloqa xatosi: Serverga ulanib bo\'lmadi';
    }

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 500) {
        return 'Click server ichki xatosi (500)';
      } else if (status === 502 || status === 503) {
        return 'Click xizmati vaqtincha ishlamayapti';
      } else if (status === 404) {
        return 'Click API endpoint topilmadi';
      }

      return `Click API xatosi: ${status} - ${data?.error_note || data?.message || 'Noma\'lum xatolik'}`;
    }

    return `Click API bilan aloqa xatosi: ${error.message}`;
  }
}
