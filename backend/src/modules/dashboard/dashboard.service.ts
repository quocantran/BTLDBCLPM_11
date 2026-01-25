import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from '../../database/schemas/course.schema';
import { Exam, ExamDocument } from '../../database/schemas/exam.schema';
import {
  Enrollment,
  EnrollmentDocument,
} from '../../database/schemas/enrollment.schema';
import {
  Submission,
  SubmissionDocument,
} from '../../database/schemas/submission.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import {
  Certificate,
  CertificateDocument,
} from '../../database/schemas/certificate.schema';
import {
  buildDashboardExamList,
  calculatePassRate,
  resolveDashboardExamStatus,
} from '../../common/utils/dashboard.util';
import type { TeacherDashboardResponseDto } from './dto/teacher-dashboard.dto';
import type { DashboardExamStatus } from '../../common/utils/dashboard.util';

interface ExamPerformanceAggregationResult {
  examId: string;
  passCount: number;
  failCount: number;
}

type LeanCourseId = { _id: Types.ObjectId };
type LeanExamForDashboard = {
  _id: Types.ObjectId;
  title: string;
  startTime: Date;
  endTime: Date;
  status: Exam['status'];
  publicId: string;
  rateScore: number;
};

type LeanTeacher = { _id: Types.ObjectId; role: 'teacher' };
type NormalizedExamForDashboard = LeanExamForDashboard & {
  status: DashboardExamStatus;
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(Exam.name)
    private readonly examModel: Model<ExamDocument>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Certificate.name)
    private readonly certificateModel: Model<CertificateDocument>,
  ) {}

  async getTeacherDashboard(
    teacherId: string,
  ): Promise<TeacherDashboardResponseDto> {
    const teacherObjectId = new Types.ObjectId(teacherId);

    const teacher = await this.userModel
      .findOne({ _id: teacherObjectId, role: 'teacher' })
      .select({ _id: 1, role: 1 })
      .lean<LeanTeacher>()
      .exec();

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const courses = await this.courseModel
      .find({ teacherId: teacherObjectId })
      .select({ _id: 1 })
      .lean<LeanCourseId[]>()
      .exec();

    if (!courses.length) {
      return this.buildEmptyDashboardResponse();
    }

    const courseIds = courses.map((course) => course._id);

    const certificatesIssuedPromise = this.countIssuedCertificates(courseIds);

    const exams = await this.examModel
      .find({ courseId: { $in: courseIds } })
      .select({
        _id: 1,
        title: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
        publicId: 1,
        rateScore: 1,
      })
      .lean<LeanExamForDashboard[]>()
      .exec();

    if (!exams.length) {
      const [totalStudents, certificatesIssued] = await Promise.all([
        this.countDistinctStudents(courseIds, []),
        certificatesIssuedPromise,
      ]);
      return this.buildEmptyDashboardResponse(
        totalStudents,
        certificatesIssued,
      );
    }

    const now = new Date();

    const normalizedExams: NormalizedExamForDashboard[] = exams.map((exam) => ({
      ...exam,
      status: resolveDashboardExamStatus(
        now,
        exam.startTime,
        exam.endTime,
        exam.status,
      ),
    }));

    const activeExamCount = normalizedExams.filter(
      (exam) => exam.status === 'active',
    ).length;

    const examIds = normalizedExams.map((exam) => exam._id);

    const [totalStudents, performanceAggregation, certificatesIssued] =
      await Promise.all([
        this.countDistinctStudents(courseIds, examIds),
        this.aggregateExamPerformance(examIds),
        certificatesIssuedPromise,
      ]);

    const performanceMap = new Map(
      performanceAggregation.map((row) => [
        row.examId,
        { passCount: row.passCount, failCount: row.failCount },
      ]),
    );

    const examPerformanceRecords = normalizedExams
      .map((exam) => {
        const examId = exam._id.toHexString();
        const stats = performanceMap.get(examId) ?? {
          passCount: 0,
          failCount: 0,
        };

        return {
          examId,
          examName: exam.title,
          examDate: exam.startTime?.toISOString(),
          passCount: stats.passCount,
          failCount: stats.failCount,
        };
      })
      .sort((a, b) => {
        const dateA = a.examDate ? new Date(a.examDate).getTime() : 0;
        const dateB = b.examDate ? new Date(b.examDate).getTime() : 0;
        return dateA - dateB;
      });

    let totalPass = 0;
    let totalAttempts = 0;

    for (const row of performanceAggregation) {
      totalPass += row.passCount;
      totalAttempts += row.passCount + row.failCount;
    }

    const passRate = calculatePassRate(totalPass, totalAttempts);

    const activeExams = buildDashboardExamList(
      normalizedExams.map((exam) => ({
        publicId: exam.publicId,
        startTime: exam.startTime,
        endTime: exam.endTime,
        status: exam.status,
      })),
    );

    return {
      stats: {
        totalStudents,
        activeExams: activeExamCount,
        certificatesIssued,
      },
      examPerformance: {
        summary: { passRate },
        records: examPerformanceRecords,
      },
      activeExams,
    };
  }

  private buildEmptyDashboardResponse(
    totalStudents = 0,
    certificatesIssued = 0,
  ): TeacherDashboardResponseDto {
    return {
      stats: {
        totalStudents,
        activeExams: 0,
        certificatesIssued,
      },
      examPerformance: {
        summary: { passRate: 0 },
        records: [],
      },
      activeExams: [],
    };
  }

  private async countDistinctStudents(
    courseIds: Types.ObjectId[],
    examIds: Types.ObjectId[],
  ): Promise<number> {
    if (!courseIds.length && !examIds.length) {
      return 0;
    }

    const [enrollmentRows, submissionRows] = await Promise.all([
      courseIds.length
        ? this.enrollmentModel
            .aggregate<{ _id: Types.ObjectId }>([
              {
                $match: {
                  courseId: { $in: courseIds },
                },
              },
              {
                $group: {
                  _id: '$studentId',
                },
              },
            ])
            .exec()
        : Promise.resolve<{ _id: Types.ObjectId }[]>([]),
      examIds.length
        ? this.submissionModel
            .aggregate<{ _id: Types.ObjectId }>([
              {
                $match: {
                  examId: { $in: examIds },
                },
              },
              {
                $group: {
                  _id: '$studentId',
                },
              },
            ])
            .exec()
        : Promise.resolve<{ _id: Types.ObjectId }[]>([]),
    ]);

    const studentIds = new Set<string>();

    for (const row of enrollmentRows) {
      const normalizedId = this.normalizeStudentId(row?._id);
      if (normalizedId) {
        studentIds.add(normalizedId);
      }
    }

    for (const row of submissionRows) {
      const normalizedId = this.normalizeStudentId(row?._id);
      if (normalizedId) {
        studentIds.add(normalizedId);
      }
    }

    return studentIds.size;
  }

  private normalizeStudentId(id: unknown): string | null {
    if (!id) {
      return null;
    }

    if (typeof id === 'string') {
      return id;
    }

    if (id instanceof Types.ObjectId) {
      return id.toHexString();
    }

    if (typeof id === 'object') {
      const candidate = id as {
        toHexString?: () => unknown;
        toString?: () => unknown;
      };

      if (typeof candidate.toHexString === 'function') {
        const value = candidate.toHexString();
        if (typeof value === 'string') {
          return value;
        }
      }

      if (typeof candidate.toString === 'function') {
        const value = candidate.toString();
        if (typeof value === 'string') {
          return value;
        }
      }
    }

    return null;
  }

  private async aggregateExamPerformance(
    examIds: Types.ObjectId[],
  ): Promise<ExamPerformanceAggregationResult[]> {
    if (!examIds.length) {
      return [];
    }

    const result = await this.submissionModel
      .aggregate<{
        _id: Types.ObjectId;
        passCount: number;
        failCount: number;
      }>([
        {
          $match: {
            examId: { $in: examIds },
            status: 'graded',
          },
        },
        {
          $lookup: {
            from: 'exams',
            localField: 'examId',
            foreignField: '_id',
            as: 'exam',
          },
        },
        { $unwind: '$exam' },
        {
          $group: {
            _id: '$examId',
            passCount: {
              $sum: {
                $cond: [{ $gte: ['$score', '$exam.rateScore'] }, 1, 0],
              },
            },
            failCount: {
              $sum: {
                $cond: [{ $lt: ['$score', '$exam.rateScore'] }, 1, 0],
              },
            },
          },
        },
      ])
      .exec();

    return result.map((row) => ({
      examId: row._id.toHexString(),
      passCount: row.passCount,
      failCount: row.failCount,
    }));
  }

  private async countIssuedCertificates(
    courseIds: Types.ObjectId[],
  ): Promise<number> {
    if (!courseIds.length) {
      return 0;
    }

    return this.certificateModel
      .countDocuments({
        courseId: { $in: courseIds },
        status: 'issued',
      })
      .exec();
  }
}
