import { PartialType } from "@nestjs/mapped-types";
import { CreateExamInvitationDto } from "./create-exam-invitation.dto";
//////////////////////////////////////////////////////////////////////////////////////

export class UpdateExamInvitationDto extends PartialType(
  CreateExamInvitationDto
) {}
