import {
  IsUrl,
  IsEnum,
  IsEmail,
  Matches,
  IsHexColor,
  IsOptional,
  IsMobilePhone,
} from "class-validator";
import { UserRole } from "../entities/user.entity";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateUserDto {
  @Matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ0-9\s]{3,20}$/, {
    message: "Name must be between 3 and 20 characters long",
  })
  name: string;

  @IsEmail()
  email: string;

  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        "Password must be at least 8 characters long and contain at least 1 uppercase, 1 lowercase, 1 number and 1 special character",
    }
  )
  password: string;

  @IsOptional()
  @IsMobilePhone("pt-BR")
  mobilePhone: string;

  @IsOptional()
  @Matches(/^(?:\d{3}\.){2}\d{3}-\d{2}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message:
      'National ID accept two possible patterns: "xxx.xxx.xxx-xx" or "xx.xxx.xxx/xxxx-xx".',
  })
  nationalId: string;

  @IsOptional()
  @IsHexColor()
  color: string;

  @IsOptional()
  @IsUrl()
  logo: string;

  @IsEnum(UserRole, {
    each: true,
    message: "Role must be either candidate, recruiter or admin",
  })
  roles: string[];
}
