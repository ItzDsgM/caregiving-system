import { IsEnum, IsArray, ArrayNotEmpty } from 'class-validator';
import { DayOfWeek } from '../../common/enums/day-of-week.enum';
import { ShiftType } from '../../common/enums/shift-type.enum';

export class AvailabilitySlotDto {
  @IsEnum(DayOfWeek, { message: 'day must be a valid DayOfWeek' })
  day: DayOfWeek;

  @IsArray()
  @ArrayNotEmpty({ message: 'shifts must contain at least one ShiftType' })
  @IsEnum(ShiftType, { each: true, message: 'Each shift must be a valid ShiftType' })
  shifts: ShiftType[];
}
