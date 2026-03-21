describe('system message helpers', () => {
  let storage: Record<string, string>;
  let helpers: any;

  beforeEach(() => {
    storage = {};
    (global as any).wx = {
      getStorageSync: jest.fn((key: string) => storage[key]),
      setStorageSync: jest.fn((key: string, value: string) => {
        storage[key] = value;
      }),
    };

    // Load fresh for each test so the helper reads the mocked wx storage API.
    jest.isolateModules(() => {
      helpers = require('../../../utils/system-messages');
    });
  });

  afterEach(() => {
    delete (global as any).wx;
    jest.resetModules();
  });

  it('merges worker wallet messages with notifications and filters duplicated wage notifications', () => {
    const notifications = [
      {
        id: 1,
        type: 'settlement',
        title: '工资到账',
        content: '您有一笔工资已到账',
        isRead: 0,
        createdAt: '2026-03-21T10:00:00.000Z',
      },
      {
        id: 2,
        type: 'cert',
        title: '认证通过',
        content: '您的临工认证已通过',
        isRead: 0,
        createdAt: '2026-03-21T09:00:00.000Z',
      },
    ];
    const transactions = {
      list: [
        {
          id: 9,
          type: 'income',
          amount: 180,
          status: 'success',
          remark: '工资结算',
          createdAt: '2026-03-21T10:00:00.000Z',
        },
        {
          id: 10,
          type: 'withdraw',
          amount: 50,
          status: 'pending',
          remark: '提现到微信零钱',
          createdAt: '2026-03-21T08:00:00.000Z',
        },
      ],
    };

    const messages = helpers.buildWorkerSystemMessages({
      notifications,
      transactions,
      userId: 7,
    });

    expect(messages.filter((item: any) => item.title === '工资到账')).toHaveLength(1);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'wallet-9',
          sourceType: 'wallet',
          title: '工资到账',
          unread: true,
        }),
        expect.objectContaining({
          id: 'wallet-10',
          sourceType: 'wallet',
          title: '提现处理中',
          unread: true,
        }),
        expect.objectContaining({
          id: 2,
          sourceType: 'notification',
          title: '认证通过',
        }),
      ]),
    );

    expect(
      helpers.countSystemUnread({
        notifications,
        transactions,
        userRole: 'worker',
        userId: 7,
      }),
    ).toBe(3);
  });

  it('marks worker wallet items read by advancing the local read watermark', () => {
    const transactions = {
      list: [
        {
          id: 21,
          type: 'income',
          amount: 300,
          status: 'success',
          createdAt: '2026-03-21T11:00:00.000Z',
        },
        {
          id: 22,
          type: 'withdraw',
          amount: 40,
          status: 'success',
          createdAt: '2026-03-21T07:00:00.000Z',
        },
      ],
    };

    const messages = helpers.buildWorkerSystemMessages({
      notifications: [],
      transactions,
      userId: 8,
    });

    helpers.markWorkerSystemMessageRead(8, messages[0]);

    expect(
      helpers.countSystemUnread({
        notifications: [],
        transactions,
        userRole: 'worker',
        userId: 8,
      }),
    ).toBe(0);
    expect((global as any).wx.setStorageSync).toHaveBeenCalled();
  });
});
