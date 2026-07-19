import { Injectable, NotFoundException } from "@nestjs/common";
import { TradingAccount } from "@prisma/client";
import { TradingAccountDto } from "@trademind/shared";
import { PrismaService } from "../prisma/prisma.service";
import { generateSyncToken } from "./sync-token";

const ONLINE_WINDOW_MS = 90_000;

export function toAccountDto(a: TradingAccount): TradingAccountDto {
  const online =
    a.lastHeartbeatAt != null &&
    Date.now() - a.lastHeartbeatAt.getTime() < ONLINE_WINDOW_MS;
  return {
    id: a.id,
    broker: a.broker,
    server: a.server,
    accountNumber: a.accountNumber == null ? null : Number(a.accountNumber),
    currency: a.currency,
    leverage: a.leverage,
    balance: a.balance,
    equity: a.equity,
    margin: a.margin,
    status: a.lastHeartbeatAt == null ? "pending" : online ? "online" : "offline",
    lastHeartbeatAt: a.lastHeartbeatAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, label: string) {
    const { token, hash } = generateSyncToken();
    const account = await this.prisma.client.tradingAccount.create({
      data: { userId, label: label || "My MT5 Account", syncTokenHash: hash },
    });
    return { account: toAccountDto(account), label: account.label, syncToken: token };
  }

  async list(userId: string) {
    const accounts = await this.prisma.client.tradingAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return accounts.map((a) => ({ ...toAccountDto(a), label: a.label }));
  }

  async getOwned(userId: string, id: string): Promise<TradingAccount> {
    const account = await this.prisma.client.tradingAccount.findFirst({
      where: { id, userId },
    });
    if (!account) throw new NotFoundException("Trading account not found");
    return account;
  }

  async rotateToken(userId: string, id: string) {
    await this.getOwned(userId, id);
    const { token, hash } = generateSyncToken();
    await this.prisma.client.tradingAccount.update({
      where: { id },
      data: { syncTokenHash: hash },
    });
    return { syncToken: token };
  }

  async remove(userId: string, id: string) {
    await this.getOwned(userId, id);
    await this.prisma.client.tradingAccount.delete({ where: { id } });
    return { deleted: true };
  }
}
