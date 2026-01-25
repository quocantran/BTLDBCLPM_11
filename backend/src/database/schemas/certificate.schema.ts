import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CertificateDocument = Certificate & Document;

@Schema({ timestamps: true })
export class Certificate {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['pending', 'issued', 'revoked'],
    default: 'pending',
  })
  status: 'pending' | 'issued' | 'revoked';

  @Prop({ type: Types.ObjectId, ref: 'Submission', required: true })
  submissionId: Types.ObjectId;

  @Prop({ unique: true, sparse: true })
  tokenId?: string; // Blockchain token ID

  @Prop()
  ipfsHash?: string; // IPFS hash for certificate metadata

  @Prop()
  ipfsImage?: string; // IPFS hash for certificate image

  @Prop()
  transactionHash?: string; // Blockchain transaction hash

  @Prop({ type: Date })
  issuedAt?: Date;

  @Prop({ type: Date })
  outdateTime?: Date; // Certificate expiration date

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);

// Indexes
CertificateSchema.index({ studentId: 1 });
CertificateSchema.index({ examId: 1 });
CertificateSchema.index({ transactionHash: 1 });
