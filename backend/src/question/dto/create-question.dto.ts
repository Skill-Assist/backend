import {
  Min,
  Max,
  Length,
  IsEnum,
  IsNumber,
  IsString,
  Validate,
  IsBoolean,
  IsOptional,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import {
  GradingCriteria,
  MultipleChoiceOption,
  MultipleChoiceGradingCriteria,
} from "../../utils/api-types.utils";
//////////////////////////////////////////////////////////////////////////////////////

@ValidatorConstraint({ name: "isValidMultipleChoiceOption", async: false })
class IsValidMultipleChoiceOption implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean | Promise<boolean> {
    if (!Array.isArray(value)) return false;

    const isValidOption = (option: any): option is MultipleChoiceOption => {
      return (
        typeof option === "object" &&
        typeof option.identifier === "string" &&
        typeof option.description === "string"
      );
    };

    return value.every(isValidOption);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be an array of valid MultipleChoiceOption objects.`;
  }
}

@ValidatorConstraint({ name: "isValidGradingCriteria", async: false })
class IsValidGradingCriteria implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean | Promise<boolean> {
    if (!Array.isArray(value)) {
      return typeof value.answer.option === "string";
    }

    const isValidOption = (condition: any): condition is GradingCriteria => {
      const isMinMaxValueValid = (
        value: any
      ): value is { min: number; max: number } => {
        return (
          typeof value === "object" &&
          typeof value.min === "number" &&
          typeof value.max === "number"
        );
      };

      const isValueCriteriaValid = (
        valueCriteria: any
      ): valueCriteria is {
        description: string;
        value: { min: number; max: number };
      } => {
        return (
          typeof valueCriteria === "object" &&
          typeof valueCriteria.description === "string" &&
          isMinMaxValueValid(valueCriteria.value)
        );
      };

      return (
        typeof condition === "object" &&
        typeof condition.criteria.title === "string" &&
        typeof condition.criteria.total_points === "number" &&
        typeof condition.criteria.maxValueCriteria === "object" &&
        isValueCriteriaValid(condition.criteria.maxValueCriteria) &&
        typeof condition.criteria.avgValueCriteria === "object" &&
        isValueCriteriaValid(condition.criteria.avgValueCriteria) &&
        typeof condition.criteria.minValueCriteria === "object" &&
        isValueCriteriaValid(condition.criteria.minValueCriteria)
      );
    };

    return value.every(isValidOption);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid grading criteria object.`;
  }
}

export class CreateQuestionDto {
  @IsEnum(["text", "multipleChoice", "programming", "challenge"], {
    message:
      "Type must be either text, multipleChoice, programming or challenge.",
  })
  type: string;

  @IsString()
  @Length(10, 5000, {
    message: "Statement must be between 10 and 5000 characters long.",
  })
  statement: string;

  @IsOptional()
  @Validate(IsValidMultipleChoiceOption)
  options?: MultipleChoiceOption[];

  @Validate(IsValidGradingCriteria)
  gradingRubric: GradingCriteria[] | MultipleChoiceGradingCriteria;

  @IsOptional()
  @Min(1)
  @Max(5)
  @IsNumber()
  difficulty?: number;

  @IsOptional()
  @IsString({ each: true })
  @Length(2, 25, {
    each: true,
    message: "Tags must be between 2 and 25 characters long.",
  })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isShareable?: boolean;
}
