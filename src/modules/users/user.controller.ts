import { Body, Controller, Delete, Get, Param, Patch } from "@nestjs/common";
import { UserService } from "./user.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Protected } from "@/common/decorators/protected.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { UserRole } from "@/core/constants/constants";

@Controller('/users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor])
    @Get()
    async getUsers() {
        return await this.userService.getUsers();
    }

    // Every dashboard loads its own profile through this right after
    // login/activation — open to any signed-in role.
    @Protected(true)
    @Get(':id')
    async getUser(@Param('id') id: string) {
        return await this.userService.getUser(id);
    }

    @Protected(true)
    @Roles([UserRole.admin])
    @Patch(':id')
    async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return await this.userService.updateUser(id, dto)
    }

    // Deliberately unauthenticated: this is the verify-email OTP-lockout
    // "wipe my own half-finished registration" flow, called before the
    // account has ever had a session. The service only allows it while the
    // account is still Inactive, so it can't be used to delete anyone
    // else's real account.
    @Delete(':id/cancel-registration')
    async cancelRegistration(@Param('id') id: string) {
        return await this.userService.cancelUnverifiedRegistration(id);
    }

    @Protected(true)
    @Roles([UserRole.admin])
    @Delete(':id')
    async deleteUser(@Param('id') id: string) {
        return await this.userService.deleteUser(id)
    }
}
