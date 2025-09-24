import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { ClickModule } from '../payment-providers/click/click.module';
import { PaymeModule } from '../payment-providers/payme/payme.module';

@Module({
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
