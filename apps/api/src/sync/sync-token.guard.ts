import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { TradingAccount } from "@prisma/client";
import type { Request } from "express";
import { hashSyncToken } from "../accounts/sync-token";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SyncTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { tradingAccount?: TradingAccount }>();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) throw new UnauthorizedException("Missing sync token");

    const account = await this.prisma.client.tradingAccount.findUnique({
      where: { syncTokenHash: hashSyncToken(token) },
    });
    if (!account) throw new UnauthorizedException("Invalid sync token");

    req.tradingAccount = account;
    return true;
  }
}

export const CurrentAccount = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TradingAccount => {
    const req = context.switchToHttp().getRequest();
    return req.tradingAccount;
  },
);
