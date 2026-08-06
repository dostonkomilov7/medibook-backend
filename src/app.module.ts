import { Module } from '@nestjs/common';
import { SequelizeModule } from "@nestjs/sequelize"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { UserModule } from './modules/users/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { validate } from './core/config/env-validation';
import configuration from './core/config/configuration';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { DoctorModule } from './modules/doctors/doctors.module';
import { AppointmentModule } from './modules/appointments/appointment.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { BotModule } from './modules/telegram/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validate,
      envFilePath: process.env.NODE_ENV === "test" ? '.env.testing' : ".env",
      load: [configuration],
    }),
    SequelizeModule.forRoot({
      dialect: "postgres",
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT),
      host: process.env.DB_HOST,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      logging: console.log,
      synchronize: true,
      sync: {
        force: process.env.NODE_ENV === 'test',
        alter: true
      },
      autoLoadModels: true,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    }),

    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        token: config.get<string>("TELEGRAM_BOT_TOKEN") as string,
        middlewares: [session()],
        polling: true,
      })
    }),
    UserModule,
    AuthModule,
    ScheduleModule,
    DoctorModule,
    AppointmentModule,
    BotModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }
  ]
})
export class AppModule { }
