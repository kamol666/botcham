import { SubscriptionMonitorService } from '../services/subscription-monitor.service';
import logger from '../../../shared/utils/logger';

export class SubscriptionChecker {
  private subscriptionMonitorService: SubscriptionMonitorService;
  private warningInterval?: NodeJS.Timeout;
  private expirationInterval?: NodeJS.Timeout;

  private readonly warningIntervalMs = 24 * 60 * 60 * 1000; // 24 hours
  private readonly expirationIntervalMs = 15 * 60 * 1000; // 15 minutes

  constructor(subscriptionMonitorService: SubscriptionMonitorService) {
    this.subscriptionMonitorService = subscriptionMonitorService;
  }

  start(): void {
    this.runChecks();

    this.warningInterval = setInterval(
      () => this.runWarningCheck(),
      this.warningIntervalMs,
    );

    this.expirationInterval = setInterval(
      () => this.runExpirationCheck(),
      this.expirationIntervalMs,
    );

    logger.info('Subscription checker started');
  }

  private async runChecks(): Promise<void> {
    try {
      logger.info('Running subscription checks...');

      await this.runWarningCheck();
      await this.runExpirationCheck();

      logger.info('Subscription checks completed');
    } catch (error) {
      logger.error('Error running subscription checks:', error);
    }
  }

  private async runWarningCheck(): Promise<void> {
    try {
      await this.subscriptionMonitorService.checkExpiringSubscriptions();
    } catch (error) {
      logger.error('Error during warning check:', error);
    }
  }

  private async runExpirationCheck(): Promise<void> {
    try {
      await this.subscriptionMonitorService.handleExpiredSubscriptions();
    } catch (error) {
      logger.error('Error during expiration check:', error);
    }
  }

  stop(): void {
    if (this.warningInterval) {
      clearInterval(this.warningInterval);
      this.warningInterval = undefined;
    }

    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
      this.expirationInterval = undefined;
    }
  }
}
