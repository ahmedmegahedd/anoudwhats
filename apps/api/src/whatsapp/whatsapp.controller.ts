import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { WhatsAppService } from './whatsapp.service';
import { Public } from '../auth/public.decorator';

// Extend Express Request to include rawBody attached by bodyParser verify callback
interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@Public()
@Controller('webhook/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  // ── GET /webhook/whatsapp  (Meta verification challenge) ─────────────────
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const expectedToken = this.config.get<string>('META_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      this.logger.log('Meta webhook verified successfully');
      res.status(HttpStatus.OK).send(challenge);
    } else {
      this.logger.warn(
        `Webhook verification failed — mode=${mode} token_match=${verifyToken === expectedToken}`,
      );
      res.status(HttpStatus.FORBIDDEN).json({ message: 'Forbidden' });
    }
  }

  // ── POST /webhook/whatsapp  (Incoming messages & status updates) ──────────
  @Post()
  receiveWebhook(@Req() req: RawBodyRequest, @Res() res: Response): void {
    // 1. Verify X-Hub-Signature-256
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const appSecret = this.config.get<string>('META_APP_SECRET');

    if (appSecret && signature && req.rawBody) {
      const expectedSig =
        'sha256=' +
        crypto
          .createHmac('sha256', appSecret)
          .update(req.rawBody)
          .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        this.logger.warn('Invalid X-Hub-Signature-256');
        res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid signature' });
        return;
      }
    } else if (!appSecret) {
      this.logger.warn('META_APP_SECRET not set — skipping signature verification');
    }

    // 2. Respond 200 immediately (Meta requires < 20s response)
    res.status(HttpStatus.OK).json({ status: 'ok' });

    // 3. Process asynchronously after responding
    const payload = req.body as Record<string, unknown>;
    this.whatsappService.processIncoming(payload);
  }
}
