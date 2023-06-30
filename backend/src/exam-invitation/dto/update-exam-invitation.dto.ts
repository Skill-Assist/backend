import { PartialType } from "@nestjs/swagger";
import { CreateExamInvitationDto } from "./create-exam-invitation.dto";
//////////////////////////////////////////////////////////////////////////////////////

export class UpdateExamInvitationDto extends PartialType(
  CreateExamInvitationDto
) {}
