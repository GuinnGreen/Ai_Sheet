import Dexie, { type EntityTable } from 'dexie'
import type {
  Setting, Class, Student, Batch, Essay, Page, GradingRun,
} from '@/types'

export class EssayGraderDB extends Dexie {
  settings!: EntityTable<Setting, 'key'>
  classes!: EntityTable<Class, 'id'>
  students!: EntityTable<Student, 'id'>
  batches!: EntityTable<Batch, 'id'>
  essays!: EntityTable<Essay, 'id'>
  pages!: EntityTable<Page, 'id'>
  gradingRuns!: EntityTable<GradingRun, 'id'>

  constructor() {
    super('essay-grader')
    this.version(1).stores({
      settings: 'key',
      classes: 'id, name',
      students: 'id, classId, seatNo, name, [classId+seatNo]',
      batches: 'id, classId, createdAt, status',
      essays: 'id, batchId, studentId, status, [batchId+studentId]',
      pages: 'id, essayId, batchId, pageIndex',
      gradingRuns: 'id, essayId, createdAt',
    })
  }
}

export const db = new EssayGraderDB()
