export class EquipmentAssignedTaskResponseDto {
  assignmentId: number | undefined;
  taskId: number | undefined;
  taskName: string | undefined;
  startDate: Date | undefined;
  endDate: Date | undefined;
  notes?: string | null;
}
