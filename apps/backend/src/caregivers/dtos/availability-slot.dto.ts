import { IsEnum, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '../../common/enums/day-of-week.enum';
import { ShiftType } from '../../common/enums/shift-type.enum';

export class AvailabilitySlotDto {
  @ApiProperty({
    description: 'Day of the week for the availability or schedule requirement',
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  @IsEnum(DayOfWeek, { message: 'day must be a valid DayOfWeek' })
  day: DayOfWeek;

  @ApiProperty({
    description: 'Array of shift types available on this day',
    enum: ShiftType,
    isArray: true,
    example: [ShiftType.MORNING, ShiftType.AFTERNOON],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'shifts must contain at least one ShiftType' })
  @IsEnum(ShiftType, { each: true, message: 'Each shift must be a valid ShiftType' })
  shifts: ShiftType[];
}
