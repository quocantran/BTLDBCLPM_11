import { Injectable, Logger } from '@nestjs/common';
import { createCanvas, CanvasRenderingContext2D, loadImage } from 'canvas';

export interface CertificateData {
  studentName: string;
  courseName: string;
  examTitle: string;
  score: number;
  issuedDate: string;
  certificateId?: string;
  studentImageUrl?: string;
  identifyNumber?: string;
  expireDate?: string;
}

@Injectable()
export class CertificateImageService {
  private readonly logger = new Logger(CertificateImageService.name);
  private readonly width = 1200;
  private readonly height = 800;

  /**
   * Tạo ảnh certificate từ dữ liệu
   * @param data - Dữ liệu certificate
   * @returns Buffer của ảnh PNG
   */
  async generateCertificateImage(data: CertificateData): Promise<Buffer> {
    try {
      const canvas = createCanvas(this.width, this.height);
      const ctx = canvas.getContext('2d');

      // Vẽ background gradient
      this.drawBackground(ctx);

      // Vẽ border, decorative elements và accent panels
      this.drawBorder(ctx);
      this.drawDecorativeElements(ctx);
      this.drawAccentBar(ctx);

      // Vẽ header
      this.drawHeader(ctx);

      // Vẽ nội dung chính & các điểm nhấn
      await this.drawStudentImage(ctx, data);
      this.drawMainContent(ctx, data);
      this.drawSeal(ctx, data.score);
      this.drawSignatureArea(ctx, data);

      // Vẽ footer
      this.drawFooter(ctx, data);

      // Convert canvas thành buffer (async variant to satisfy lint)
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        canvas.toBuffer((err, result) => {
          if (err || !result) {
            const rejectionReason =
              err instanceof Error
                ? err
                : new Error('Failed to render certificate image.');
            reject(rejectionReason);
            return;
          }
          resolve(result);
        }, 'image/png');
      });
      this.logger.log('Certificate image generated successfully');

      return buffer;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error generating certificate image: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(`Failed to generate certificate image: ${errorMessage}`);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    // Clean white background - professional and print-ready
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawBorder(ctx: CanvasRenderingContext2D): void {
    // Elegant gold border - classic and professional
    const borderMargin = 60;
    const borderWidth = 4;

    // Outer gold border
    ctx.strokeStyle = '#D4AF37'; // Classic gold color
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(
      borderMargin,
      borderMargin,
      this.width - borderMargin * 2,
      this.height - borderMargin * 2,
    );

    // Inner decorative border (thinner)
    const innerMargin = borderMargin + 20;
    ctx.strokeStyle = '#C9A961'; // Lighter gold
    ctx.lineWidth = 2;
    ctx.strokeRect(
      innerMargin,
      innerMargin,
      this.width - innerMargin * 2,
      this.height - innerMargin * 2,
    );
  }

  private drawDecorativeElements(ctx: CanvasRenderingContext2D): void {
    // Minimalist decorative lines - elegant and clean
    const lineY1 = 150;
    const lineY2 = this.height - 150;
    const lineMargin = 200;

    // Subtle gold decorative lines
    ctx.strokeStyle = '#E5D4A1'; // Light gold
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lineMargin, lineY1);
    ctx.lineTo(this.width - lineMargin, lineY1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lineMargin, lineY2);
    ctx.lineTo(this.width - lineMargin, lineY2);
    ctx.stroke();
  }

  private drawAccentBar(ctx: CanvasRenderingContext2D): void {
    // Removed accent bar for minimalist design
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    // Formal typography with serif fonts
    const centerX = this.width / 2;
    let currentY = 130;

    // Main title - formal serif font
    ctx.fillStyle = '#1A1A1A'; // Deep black for professional look
    ctx.font = 'bold 56px "Times New Roman", "Times", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('CERTIFICATE OF COMPLETION', centerX, currentY);
    currentY += 80;

    // Institution name - elegant serif
    ctx.fillStyle = '#D4AF37'; // Gold color
    ctx.font = 'bold 32px "Times New Roman", "Times", serif';
    ctx.fillText('ACADEMIX INSTITUTE', centerX, currentY);
    currentY += 50;

    // Formal certification statement
    ctx.fillStyle = '#4A4A4A'; // Dark gray
    ctx.font = 'italic 26px "Georgia", "Times New Roman", serif';
    ctx.fillText('This is to certify that', centerX, currentY);
  }

  /**
   * Vẽ ảnh học sinh vào certificate
   * @param ctx - Canvas context
   * @param data - Dữ liệu certificate bao gồm studentImageUrl
   */
  private async drawStudentImage(
    ctx: CanvasRenderingContext2D,
    data: CertificateData,
  ): Promise<void> {
    if (!data.studentImageUrl) {
      this.logger.warn('No student image URL provided, skipping student image');
      return;
    }

    try {
      // Load ảnh từ URL
      const img = await loadImage(data.studentImageUrl);

      // Vị trí và kích thước ảnh học sinh (góc trên bên trái, bên cạnh header)
      const imageSize = 120; // Kích thước ảnh vuông
      const imageX = 100; // Vị trí X (bên trái)
      const imageY = 100; // Vị trí Y (gần header)

      // Vẽ khung tròn cho ảnh với shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;

      // Vẽ background tròn (màu trắng)
      const centerX = imageX + imageSize / 2;
      const centerY = imageY + imageSize / 2;
      const radius = imageSize / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Gold border for student image
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#D4AF37'; // Classic gold
      ctx.stroke();

      // Clip để vẽ ảnh trong hình tròn
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
      ctx.clip();

      // Tính toán để crop và resize ảnh để fit vào hình tròn
      const aspectRatio = img.width / img.height;
      let drawWidth = imageSize;
      let drawHeight = imageSize;
      let drawX = imageX;
      let drawY = imageY;

      if (aspectRatio > 1) {
        // Ảnh ngang hơn
        drawHeight = imageSize;
        drawWidth = imageSize * aspectRatio;
        drawX = imageX - (drawWidth - imageSize) / 2;
      } else {
        // Ảnh dọc hơn
        drawWidth = imageSize;
        drawHeight = imageSize / aspectRatio;
        drawY = imageY - (drawHeight - imageSize) / 2;
      }

      // Vẽ ảnh
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      ctx.restore();

      this.logger.log('Student image drawn successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to load or draw student image: ${errorMessage}. Continuing without student image.`,
      );
      // Không throw error, chỉ log warning và tiếp tục tạo certificate không có ảnh
    }
  }

  private drawMainContent(
    ctx: CanvasRenderingContext2D,
    data: CertificateData,
  ): void {
    const centerX = this.width / 2;
    let currentY = 280;

    // Student name - prominent formal serif
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 58px "Times New Roman", "Times", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(data.studentName, centerX, currentY);
    currentY += 100;

    // Course completion text - formal serif
    ctx.fillStyle = '#4A4A4A';
    ctx.font = '28px "Georgia", "Times New Roman", serif';
    ctx.fillText('has successfully completed the course', centerX, currentY);
    currentY += 60;

    // Course name - bold serif
    ctx.fillStyle = '#2C2C2C';
    ctx.font = 'bold 42px "Times New Roman", "Times", serif';
    ctx.fillText(`"${data.courseName}"`, centerX, currentY);
    currentY += 70;

    // Exam title - formal serif
    ctx.fillStyle = '#5A5A5A';
    ctx.font = '24px "Georgia", "Times New Roman", serif';
    ctx.fillText(`Examination: ${data.examTitle}`, centerX, currentY);
    currentY += 50;

    // Identification Number - if available
    if (data.identifyNumber) {
      ctx.fillStyle = '#4A4A4A';
      ctx.font = '22px "Georgia", "Times New Roman", serif';
      ctx.fillText(
        `Identification Number: ${data.identifyNumber}`,
        centerX,
        currentY,
      );
      currentY += 50;
    }

    // Expire date - if available
    if (data.expireDate) {
      ctx.fillStyle = '#5A5A5A';
      ctx.font = '20px "Georgia", "Times New Roman", serif';
      ctx.fillText(`Valid until: ${data.expireDate}`, centerX, currentY);
      currentY += 50;
    }

    // Score - elegant presentation
    ctx.fillStyle = '#2C2C2C';
    ctx.font = '26px "Georgia", "Times New Roman", serif';
    const scoreText = `Achieved Score: ${data.score.toFixed(1)}%`;
    ctx.fillText(scoreText, centerX, currentY);
  }

  private drawSeal(ctx: CanvasRenderingContext2D, score: number): void {
    const sealX = this.width - 200;
    const sealY = this.height / 2 - 50;
    const sealRadius = 75;

    ctx.save();

    // Gold seal with elegant shadow
    ctx.shadowColor = 'rgba(212, 175, 55, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    // Outer gold ring
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF9E6'; // Light cream background
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#D4AF37'; // Classic gold
    ctx.stroke();

    // Inner decorative ring
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealRadius - 15, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#C9A961'; // Lighter gold
    ctx.stroke();

    // Decorative pattern - dashed circle
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealRadius - 25, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#D4AF37';
    ctx.stroke();
    ctx.setLineDash([]);

    // Score text - formal serif
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 36px "Times New Roman", "Times", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${score.toFixed(0)}%`, sealX, sealY - 8);

    // Excellence label - formal serif
    ctx.fillStyle = '#8B6914'; // Dark gold
    ctx.font = 'bold 16px "Times New Roman", "Times", serif';
    ctx.fillText('EXCELLENCE', sealX, sealY + 20);

    ctx.restore();
  }

  private drawSignatureArea(
    ctx: CanvasRenderingContext2D,
    data: CertificateData,
  ): void {
    const areaY = this.height - 200;
    const signatureY = areaY + 40;
    const leftX = 120;
    const rightX = this.width - 120;
    const lineLength = 200;

    // Left signature area
    ctx.strokeStyle = '#8B6914'; // Dark gold
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftX, signatureY);
    ctx.lineTo(leftX + lineLength, signatureY);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#4A4A4A';
    ctx.font = '18px "Georgia", "Times New Roman", serif';
    ctx.fillText('Authorized Signature', leftX, signatureY + 25);

    // Right side - Certificate ID
    ctx.textAlign = 'right';
    ctx.fillStyle = '#5A5A5A';
    ctx.font = '16px "Georgia", "Times New Roman", serif';
    const certIdText = data.certificateId
      ? `Certificate ID: ${data.certificateId}`
      : 'Academix Education Platform';
    ctx.fillText(certIdText, rightX, signatureY + 25);
  }

  private drawFooter(
    ctx: CanvasRenderingContext2D,
    data: CertificateData,
  ): void {
    const centerX = this.width / 2;
    const footerY = this.height - 70;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#5A5A5A';
    ctx.font = '20px "Georgia", "Times New Roman", serif';
    ctx.fillText(`Issued on ${data.issuedDate}`, centerX, footerY);

    ctx.fillStyle = '#D4AF37'; // Gold color
    ctx.font = 'bold 24px "Times New Roman", "Times", serif';
    ctx.fillText('Academix Education Platform', centerX, footerY + 35);
  }
}
