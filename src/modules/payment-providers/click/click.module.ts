import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClickController } from './click.controller';
import { ClickService } from './click.service';
import { ClickShopController } from './click-shop.controller';
import { ClickShopService } from './click-shop.service';
import { BotModule } from '../../bot/bot.module';

@Module({
  imports: [ConfigModule, forwardRef(() => BotModule)],
  controllers: [ClickController, ClickShopController],
  providers: [ClickService, ClickShopService],
  exports: [ClickService, ClickShopService],
})
export class ClickModule { }
