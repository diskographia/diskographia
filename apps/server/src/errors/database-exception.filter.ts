import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

// правила базы (check, unique, триггеры) отвечают человеку словами, а не пятисоткой
const CONSTRAINT_MESSAGES: Record<string, string> = {
  entity_events_announce_check: 'время анонса не может быть позже начала',
  entity_events_period_check: 'конец не может быть раньше начала',
  entity_events_coords_check: 'широта и долгота задаются вместе',
  entity_events_linger_check: 'дней после окончания может быть от 0 до 365',
  entity_events_ttl_check: 'срок жизни заявки от 1 до 90 дней',
  entity_products_price_check: 'цена не может быть отрицательной',
  entity_products_price_check_one_of: 'нужна либо сумма с валютой, либо ценник словами',
  event_schedule_period_check: 'конец не может быть раньше начала',
  entity_media_source_check: 'медиа либо файл, либо трансляция',
  profile_feedback_not_self_check: 'нельзя откликнуться своему профилю',
  entities_owner_slug_key: 'предмет с таким адресом у вас уже есть',
  entities_owner_inventory_slot_key: 'эта ячейка инвентаря уже занята',
  entity_children_parent_slot_key: 'эта ячейка контейнера уже занята',
  profiles_handle_lower_key: 'ник занят',
  profiles_handle_unique: 'ник занят',
  accounts_email_unique: 'почта уже используется',
  roles_owner_name_key: 'роль с таким названием у вас уже есть',
  tags_name_unique: 'такой тег уже есть',
  files_sha256_unique: 'такой файл уже загружен',
};

interface PostgresError {
  code?: string;
  constraint_name?: string;
  message?: string;
}

function isPostgresError(value: unknown): value is PostgresError {
  return typeof value === 'object' && value !== null && typeof (value as PostgresError).code === 'string';
}

@Catch()
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      response.status(exception.getStatus()).json(typeof body === 'string' ? { message: body } : body);
      return;
    }

    // drizzle заворачивает ошибку базы в свою, настоящая лежит в cause
    const cause = exception instanceof Error && isPostgresError(exception.cause) ? exception.cause : exception;
    const translated = isPostgresError(cause) ? translate(cause) : null;

    if (translated) {
      response.status(translated.status).json({ message: translated.message });
      return;
    }

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'на сервере что-то сломалось, попробуйте позже' });
  }
}

function translate(error: PostgresError): { status: number; message: string } | null {
  const named = error.constraint_name ? CONSTRAINT_MESSAGES[error.constraint_name] : undefined;

  switch (error.code) {
    case '23505':
      return { status: HttpStatus.CONFLICT, message: named ?? 'такая запись уже есть' };
    case '23514':
      return { status: HttpStatus.BAD_REQUEST, message: named ?? 'данные не проходят проверку базы' };
    case '23503':
      return { status: HttpStatus.BAD_REQUEST, message: 'ссылка на запись, которой нет' };
    case '23502':
      return { status: HttpStatus.BAD_REQUEST, message: 'не хватает обязательного поля' };
    case '22P02':
    case '22007':
    case '22008':
      return { status: HttpStatus.BAD_REQUEST, message: 'значение в неверном формате' };
    case 'P0001':
      return { status: HttpStatus.BAD_REQUEST, message: error.message ?? 'действие запрещено правилами базы' };
    default:
      return null;
  }
}
