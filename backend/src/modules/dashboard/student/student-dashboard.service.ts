import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Submission,
  SubmissionDocument,
} from '../../../database/schemas/submission.schema';
import {
  StudentDashboardExamResultDto,
  StudentDashboardPerformanceDto,
  StudentDashboardResponseDto,
} from '../dto/student-dashboard.dto';

@Injectable()
export class StudentDashboardService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
  ) {}

  async getStudentDashboard(
    studentId: string,
  ): Promise<StudentDashboardResponseDto> {
    if (!studentId || !Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student identifier');
    }

    const studentObjectId = new Types.ObjectId(studentId);

    const completedExams = await this.buildCompletedExamResults(
      studentObjectId,
      12,
    );

    if (!completedExams.length) {
      return this.buildEmptyResponse();
    }

    return {
      performance: this.buildPerformanceSnapshot(completedExams),
      completedExams,
    };
  }
  private buildPerformanceSnapshot(
    results: StudentDashboardExamResultDto[],
  ): StudentDashboardPerformanceDto {
    if (!results.length) {
      return {
        points: [],
        averageScore: 0,
        passRate: 0,
      };
    }

    const points = [...results]
      .sort(
        (a, b) =>
          new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
      )
      .map((result) => ({
        submittedAt: result.submittedAt,
        score: result.score,
        examTitle: result.examTitle,
        result: result.result,
      }));

    const totalScore = results.reduce((acc, item) => acc + item.score, 0);
    const passCount = results.filter((item) => item.result === 'Passed').length;

    const averageScore = Number((totalScore / results.length).toFixed(1));
    const passRate = Math.round((passCount / results.length) * 100);

    return {
      points,
      averageScore,
      passRate,
    };
  }

  private buildEmptyResponse(): StudentDashboardResponseDto {
    return {
      performance: {
        points: [],
        averageScore: 0,
        passRate: 0,
      },
      completedExams: [],
    };
  }

  private async buildCompletedExamResults(
    studentId: Types.ObjectId,
    limit: number,
  ): Promise<StudentDashboardExamResultDto[]> {
    const rows = await this.submissionModel
      .aggregate<{
        submissionId: string;
        examPublicId: string;
        examTitle: string;
        courseName: string;
        score: number;
        examRateScore: number;
        submittedAt?: Date;
      }>([
        {
          $match: {
            studentId,
            status: 'graded',
          },
        },
        {
          $sort: {
            submittedAt: -1,
            updatedAt: -1,
          },
        },
        { $limit: limit },
        {
          $lookup: {
            from: 'exams',
            localField: 'examId',
            foreignField: '_id',
            as: 'exam',
            pipeline: [
              {
                $project: {
                  publicId: 1,
                  title: 1,
                  rateScore: 1,
                  courseId: 1,
                },
              },
            ],
          },
        },
        { $unwind: '$exam' },
        {
          $lookup: {
            from: 'courses',
            localField: 'exam.courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [
              {
                $project: {
                  courseName: 1,
                },
              },
            ],
          },
        },
        { $unwind: '$course' },
        {
          $project: {
            submissionId: { $toString: '$_id' },
            examPublicId: '$exam.publicId',
            examTitle: '$exam.title',
            courseName: '$course.courseName',
            score: '$score',
            examRateScore: '$exam.rateScore',
            submittedAt: { $ifNull: ['$submittedAt', '$updatedAt'] },
          },
        },
      ])
      .exec();

    return rows.map((row) => ({
      submissionId: row.submissionId,
      examPublicId: row.examPublicId,
      examTitle: row.examTitle,
      courseName: row.courseName,
      score: row.score,
      result: row.score >= row.examRateScore ? 'Passed' : 'Failed',
      submittedAt: row.submittedAt?.toISOString() ?? new Date().toISOString(),
    }));
  }
}
