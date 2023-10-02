import {
  IsIn,
  IsUrl,
  Length,
  IsEmail,
  Matches,
  IsString,
  IsHexColor,
  IsOptional,
  IsMobilePhone,
} from "class-validator";
import { Transform } from "class-transformer";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateUserDto {
  @IsOptional()
  @Transform((name) => name.value.trim())
  @IsString()
  @Length(1, 50, {
    message: "Name cannot be longer than 50 characters",
  })
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 12, {
    message: "Nickname cannot be longer than 12 characters",
  })
  nickname?: string;

  @Transform((email) => email.value.toLowerCase())
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 20, {
    message: "Password must be between 8 and 20 characters long",
  })
  password: string;

  @IsString()
  @Length(8, 20, {
    message: "Password confirm must be between 8 and 20 characters long",
  })
  passwordConfirm: string;

  @IsOptional()
  @IsMobilePhone("pt-BR")
  mobilePhone?: string;

  @IsOptional()
  @Matches(/^(?:\d{3}\.){2}\d{3}-\d{2}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message:
      'National ID accept two possible patterns: "xxx.xxx.xxx-xx" or "xx.xxx.xxx/xxxx-xx".',
  })
  nationalId?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsUrl()
  logo?: string;

  @IsIn(["candidate", "recruiter"], {
    each: true,
    message: "Role must be either candidate or recruiter",
  })
  roles: string[];
}
