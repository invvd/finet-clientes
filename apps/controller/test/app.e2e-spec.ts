import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, Controller, Get } from '@nestjs/common';
import request from 'supertest';
import { afterEach } from 'node:test';

@Controller()
class RootController {
  @Get()
  getRoot(): string {
    return 'Hello World!';
  }
}

@Module({ controllers: [RootController] })
class TestAppModule {}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
