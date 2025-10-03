import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PaymentSession } from '../../../shared/database/models/payment-session.model';
import { Plan } from '../../../shared/database/models/plans.model';
import { getClickRedirectLink } from '../../../shared/generators/click-redirect-link.generator';

@Injectable()
export class ClickShopService {
  private readonly logger = new Logger(ClickShopService.name);

  constructor(private readonly configService: ConfigService) { }

  async createPaymentSession(createPaymentDto: {
    userId: string;
    planId: string;
    selectedService?: string;
  }) {
    try {
      const { userId, planId, selectedService } = createPaymentDto;

      this.logger.log('Click to\'lov sessiyasi yaratilmoqda', {
        userId,
        planId,
      });

      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan topilmadi');
      }

      const sessionToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await PaymentSession.create({
        sessionToken,
        userId,
        planId,
        selectedService: selectedService ?? 'yulduz',
        amount: plan.price,
        provider: 'click',
        status: 'pending',
        expiresAt,
      });

      const redirectUrl = `${this.configService.get('BASE_URL')}/api/click-shop/initiate-payment/${sessionToken}`;

      return {
        session_token: sessionToken,
        expires_at: expiresAt,
        redirect_url: redirectUrl,
      };
    } catch (error) {
      this.logger.error('Click sessiya yaratishda xatolik', error);
      throw error;
    }
  }

  async createPaymentFromSession(sessionToken: string) {
    const session = await PaymentSession.findOne({
      sessionToken,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new Error('Session topilmadi yoki muddati tugagan');
    }

    const plan = await Plan.findById(session.planId);
    if (!plan) {
      throw new Error('Plan topilmadi');
    }

    const paymentUrl = getClickRedirectLink({
      amount: plan.price,
      planId: plan._id.toString(),
      userId: session.userId,
      selectedService: session.selectedService,
    });

    session.status = 'used';
    await session.save();

    return {
      payment_url: paymentUrl,
    };
  }

  async createDirectPaymentLink(createPaymentDto: {
    userId: string;
    planId: string;
    selectedService?: string;
  }) {
    try {
      const { userId, planId, selectedService } = createPaymentDto;

      this.logger.log('Click to\'g\'ridan-to\'g\'ri to\'lov linki yaratilmoqda', {
        userId,
        planId,
      });

      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan topilmadi');
      }

      const paymentUrl = getClickRedirectLink({
        amount: plan.price,
        planId: plan._id.toString(),
        userId: userId,
        selectedService: selectedService ?? 'yulduz',
      });

      return {
        payment_url: paymentUrl,
      };
    } catch (error) {
      this.logger.error('Click to\'g\'ridan-to\'g\'ri link yaratishda xatolik', error);
      throw error;
    }
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }
}
