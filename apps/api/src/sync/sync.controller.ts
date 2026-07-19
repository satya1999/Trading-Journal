import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";
import { TradingAccount } from "@prisma/client";
import {
  HandshakeResponse,
  SyncDealsResponse,
  handshakeSchema,
  heartbeatSchema,
  syncDealsSchema,
} from "@trademind/shared";
import { ZodTypeAny, z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { IngestionService } from "./ingestion.service";
import { CurrentAccount, SyncTokenGuard } from "./sync-token.guard";

function parse<S extends ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(result.error.flatten());
  }
  return result.data;
}

@Controller("sync")
@UseGuards(SyncTokenGuard)
export class SyncController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestion: IngestionService,
  ) {}

  @Post("handshake")
  async handshake(
    @CurrentAccount() account: TradingAccount,
    @Body() body: unknown,
  ): Promise<HandshakeResponse> {
    const p = parse(handshakeSchema, body);
    await this.prisma.client.tradingAccount.update({
      where: { id: account.id },
      data: {
        accountNumber: BigInt(p.accountNumber),
        broker: p.broker,
        server: p.server,
        currency: p.currency,
        leverage: p.leverage,
        balance: p.balance,
        equity: p.equity,
        utcOffsetMinutes: p.utcOffsetMinutes,
        lastHeartbeatAt: new Date(),
      },
    });
    return {
      accountId: account.id,
      lastDealTicket: Number(account.lastDealTicket),
    };
  }

  @Post("heartbeat")
  async heartbeat(
    @CurrentAccount() account: TradingAccount,
    @Body() body: unknown,
  ) {
    const p = parse(heartbeatSchema, body);
    await this.prisma.client.tradingAccount.update({
      where: { id: account.id },
      data: {
        balance: p.balance,
        equity: p.equity,
        margin: p.margin,
        freeMargin: p.freeMargin,
        lastHeartbeatAt: new Date(),
      },
    });
    await this.prisma.client.accountSnapshot.create({
      data: {
        accountId: account.id,
        balance: p.balance,
        equity: p.equity,
        margin: p.margin,
        freeMargin: p.freeMargin,
      },
    });
    return { ok: true };
  }

  @Post("deals")
  async deals(
    @CurrentAccount() account: TradingAccount,
    @Body() body: unknown,
  ): Promise<SyncDealsResponse> {
    const p = parse(syncDealsSchema, body);
    return this.ingestion.ingest(account, p);
  }
}
