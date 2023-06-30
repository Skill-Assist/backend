import { SetMetadata } from "@nestjs/common";
////////////////////////////////////////////////////////////////////////////////

/**
 * AllowAnon Guard
 * @see https://docs.nestjs.com/security/authentication#enable-authentication-globally
 */

export const AllowAnon = () => SetMetadata("isPublic", true);
