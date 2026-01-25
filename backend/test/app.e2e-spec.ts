import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { Response as SupertestResponse } from 'supertest';

interface RootSuccessResponse {
  success: boolean;
  data?: {
    name?: string;
  };
}
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response: SupertestResponse = await request(server).get('/');
    const body = response.body as RootSuccessResponse;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.name).toBe('Academix API');
  });
});
