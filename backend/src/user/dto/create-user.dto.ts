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
//////////////////////////////////////////////////////////////////////////////////////

export class CreateUserDto {
  @IsString()
  @Length(3, 50, {
    message: "Name must be between 3 and 50 characters long",
  })
  name: string;

  @IsOptional()
  @IsString()
  @Length(2, 12, {
    message: "Nickname must be between 3 and 12 characters long",
  })
  nickname?: string;

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
