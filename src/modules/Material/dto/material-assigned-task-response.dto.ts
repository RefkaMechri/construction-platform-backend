export class MaterialAssignedTaskResponseDto {
  assignmentId!: number;
  taskId!: number;
  taskName!: string;
  quantity!: number;
  startDate!: Date;
  status!: string;
  notes?: string | null;
}
