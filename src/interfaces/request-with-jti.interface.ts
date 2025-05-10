import { RequestWithUser } from './request-with-user.interface';

export interface RequestWithJTI extends RequestWithUser {
  jti: string;
}
