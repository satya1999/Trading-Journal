import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, SessionGuard } from "../auth/session.guard";
import type { SessionUser } from "../auth/auth";
import { AccountsService, toAccountDto } from "./accounts.service";

@Controller("accounts")
@UseGuards(SessionGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.accounts.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() body: { label?: string }) {
    return this.accounts.create(user.id, body?.label?.trim() ?? "");
  }

  @Get(":id")
  async get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const account = await this.accounts.getOwned(user.id, id);
    return { ...toAccountDto(account), label: account.label };
  }

  @Post(":id/rotate-token")
  rotate(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.accounts.rotateToken(user.id, id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.accounts.remove(user.id, id);
  }
}
