import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  mixin,
  Type,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { RequestWithUser } from 'src/interfaces/request-with-user.interface';

export function OwnershipGuard(paramKey: string): Type<CanActivate> {
  /**
   * Проверяет на пренадлежность ресурса пользователю, если у него нет роли Admin
   * @param paramKey — имя параметра из req.params, содержащего ID ресурса.
   */
  @Injectable()
  class MixinOwnershipGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<RequestWithUser>();
      const { user } = req;
      const targetId = req.params[paramKey];

      if (!user) {
        throw new ForbiddenException('Пользователь не найден в запросе');
      }

      // Админ может всё
      if (user.role === Role.ADMIN) {
        return true;
      }

      // Обычный пользователь — только свой ресурс
      if (user.id.toString() === targetId) {
        return true;
      }

      throw new ForbiddenException('Недостаточно прав');
    }
  }

  return mixin(MixinOwnershipGuard);
}
