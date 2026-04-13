import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from './public.decorator';

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: SupabaseUser;
    }>();

    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
      const supabaseKey = this.configService.getOrThrow<string>('SUPABASE_ANON_KEY');
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseKey,
        },
      });
      if (!res.ok) {
        throw new UnauthorizedException('Invalid token');
      }
      const user = (await res.json()) as SupabaseUser;
      request.user = user;
      return true;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Auth failed: ${msg}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
