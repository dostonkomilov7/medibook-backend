import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { User } from "./model/user.model";
import { Doctor } from "../doctors/model/doctors.model";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
    imports: [SequelizeModule.forFeature([User, Doctor])],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})

export class UserModule {}