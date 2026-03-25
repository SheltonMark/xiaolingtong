import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WechatSecurityService } from './wechat-security.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WechatSecurityService', () => {
  let service: WechatSecurityService;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          WX_APPID: 'wx-app-id',
          WX_SECRET: 'wx-secret',
        };
        return values[key];
      }),
    };

    service = new WechatSecurityService(configService as unknown as ConfigService);
    mockedAxios.get.mockResolvedValue({
      data: {
        access_token: 'token-1',
        expires_in: 7200,
      },
    } as any);
    mockedAxios.post.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses version 2 text check with openid when provided', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { errcode: 0, result: { suggest: 'pass' } },
    } as any);

    await service.assertSafeSubmission({
      texts: ['包装工招聘'],
      openid: 'real-openid',
    } as any);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/wxa/msg_sec_check?access_token=token-1'),
      {
        content: '包装工招聘',
        scene: 3,
        version: 2,
        openid: 'real-openid',
      },
      { timeout: 10000 },
    );
  });

  it('falls back to legacy text check when openid is missing', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { errcode: 0 },
    } as any);

    await service.assertSafeSubmission({
      texts: ['采购需求'],
    } as any);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/wxa/msg_sec_check?access_token=token-1'),
      { content: '采购需求' },
      { timeout: 10000 },
    );
  });

  it('falls back to legacy text check when wechat returns invalid openid', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({
        data: { errcode: 40003, errmsg: 'invalid openid hint: [abc]' },
      } as any)
      .mockResolvedValueOnce({
        data: { errcode: 0 },
      } as any);

    await service.assertSafeSubmission({
      texts: ['举报内容'],
      openid: 'dev_invalid_openid',
    } as any);

    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/wxa/msg_sec_check?access_token=token-1'),
      {
        content: '举报内容',
        scene: 3,
        version: 2,
        openid: 'dev_invalid_openid',
      },
      { timeout: 10000 },
    );
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/wxa/msg_sec_check?access_token=token-1'),
      { content: '举报内容' },
      { timeout: 10000 },
    );
  });

  it('uses version 2 media check with openid when provided', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { errcode: 0, result: { suggest: 'pass' } },
    } as any);

    await service.assertSafeSubmission({
      images: ['https://cdn.example.com/job-1.jpg'],
      openid: 'real-openid',
    } as any);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/wxa/media_check_async?access_token=token-1'),
      {
        media_url: 'https://cdn.example.com/job-1.jpg',
        media_type: 2,
        scene: 3,
        version: 2,
        openid: 'real-openid',
      },
      { timeout: 10000 },
    );
  });

  it('falls back to legacy media check when openid is missing', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { errcode: 0, result: { suggest: 'pass' } },
    } as any);

    await service.assertSafeSubmission({
      images: ['https://cdn.example.com/job-2.jpg'],
    } as any);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/wxa/media_check_async?access_token=token-1'),
      {
        media_url: 'https://cdn.example.com/job-2.jpg',
        media_type: 2,
      },
      { timeout: 10000 },
    );
  });

  it('falls back to legacy media check when wechat returns invalid openid', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({
        data: { errcode: 40003, errmsg: 'invalid openid hint: [abc]' },
      } as any)
      .mockResolvedValueOnce({
        data: { errcode: 0, result: { suggest: 'pass' } },
      } as any);

    await service.assertSafeSubmission({
      images: ['https://cdn.example.com/job-3.jpg'],
      openid: 'dev_invalid_openid',
    } as any);

    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/wxa/media_check_async?access_token=token-1'),
      {
        media_url: 'https://cdn.example.com/job-3.jpg',
        media_type: 2,
        scene: 3,
        version: 2,
        openid: 'dev_invalid_openid',
      },
      { timeout: 10000 },
    );
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/wxa/media_check_async?access_token=token-1'),
      {
        media_url: 'https://cdn.example.com/job-3.jpg',
        media_type: 2,
      },
      { timeout: 10000 },
    );
  });

  it('still rejects non-compliant content after legacy fallback', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({
        data: { errcode: 40003, errmsg: 'invalid openid hint: [abc]' },
      } as any)
      .mockResolvedValueOnce({
        data: { errcode: 87014 },
      } as any);

    await expect(
      service.assertSafeSubmission({
        texts: ['违规内容'],
        openid: 'dev_invalid_openid',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
