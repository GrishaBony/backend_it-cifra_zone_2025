import { $Enums, User } from '@prisma/client';

export class UserPublicDto {
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  photoUrl?: string | null;
  name?: string | null;
  photo?: string | null;
  role: $Enums.Role;

  constructor(user: User) {
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.username = user.username;
    this.photoUrl = user.photoUrl;
    this.name = user.name;
    this.photo = user.photo;
    this.role = user.role;
  }
}
