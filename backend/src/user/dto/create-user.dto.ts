import { UserRole } from "../entities/user.entity";
import { IsEmail, Matches, IsEnum } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateUserDto {
  @Matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ\s]{3,20}$/, {
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

  @IsEnum(UserRole, {
    each: true,
    message: "Role must be either candidate, recruiter or admin",
  })
  roles: string[];
}
