import { Injectable } from "@nestjs/common";
import { InjectBot } from "nestjs-telegraf";
import { Telegraf } from "telegraf";

@Injectable()
export class BotService {
    constructor(@InjectBot() private readonly bot: Telegraf) {}

    async sendMessage(id: string, message: string) {
        await this.bot.telegram.sendMessage(id, message)
    }
}