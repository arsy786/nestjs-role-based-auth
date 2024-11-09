import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';

// A custom decorator to set roles metadata on the route handler
export const HasRoles = (...roles: Role[]) => SetMetadata('roles', roles);
