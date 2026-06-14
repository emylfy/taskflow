import { PrismaClient, MemberRole, TaskStatus, Priority, SubStatus } from '@prisma/client';
import { FREE_FEATURES, TEAM_FEATURES, BUSINESS_FEATURES } from '../src/lib/plan-limits';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Подготовка данных для демонстрации TaskFlow');

  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.yjsSnapshot.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.member.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: 'Команда TaskFlow',
      slug: 'taskflow-team',
    },
  });

  const usersData = [
    { name: 'Иван Соколов', email: 'ivan.sokolov@taskflow.ru', role: MemberRole.OWNER, position: 'Продуктовый дизайнер' },
    { name: 'Мария Петрова', email: 'maria.petrova@taskflow.ru', role: MemberRole.ADMIN, position: 'Руководитель проекта' },
    { name: 'Сергей Николаев', email: 'sergey.nikolaev@taskflow.ru', role: MemberRole.MEMBER, position: 'Бэкенд-разработчик' },
    { name: 'Елена Куликова', email: 'elena.kulikova@taskflow.ru', role: MemberRole.MEMBER, position: 'Продуктовый аналитик' },
    { name: 'Тимур Белов', email: 'timur.belov@taskflow.ru', role: MemberRole.MEMBER, position: 'Маркетолог' },
  ];

  const users = [];
  const memberRecords = [];
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        emailVerified: true,
        position: u.position,
      },
    });
    const member = await prisma.member.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: u.role,
      },
    });
    users.push(user);
    memberRecords.push(member);
  }

  const projectData = [
    {
      name: 'Редизайн сайта',
      description: 'Обновление главной страницы, страниц продуктов и тарифов к лету 2026 года.',
    },
    {
      name: 'Запуск мобильного приложения',
      description: 'Подготовка к публикации мобильного клиента TaskFlow в российских магазинах приложений.',
    },
    {
      name: 'Маркетинговая кампания Q2 2026',
      description: 'План привлечения клиентов и контент-план второго квартала 2026 года.',
    },
  ];

  const projects = [];
  for (const p of projectData) {
    projects.push(
      await prisma.project.create({
        data: {
          name: p.name,
          description: p.description,
          organizationId: org.id,
        },
      }),
    );
  }

  const tasksForRedesign = [
    { title: 'Подготовить макеты главной страницы', status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assignee: 1, labels: ['дизайн'] },
    { title: 'Согласовать техническое задание с заказчиком', status: TaskStatus.TODO, priority: Priority.CRITICAL, assignee: 0, labels: ['планирование'] },
    { title: 'Обновить схему базы данных под отчёты', status: TaskStatus.TODO, priority: Priority.MEDIUM, assignee: 2, labels: ['архитектура'] },
    { title: 'Провести исследование пользователей', status: TaskStatus.TODO, priority: Priority.MEDIUM, assignee: 3, labels: ['продукт'] },
    { title: 'Настроить развёртывание через Docker Compose', status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assignee: 2, labels: ['инфраструктура'] },
    { title: 'Вёрстка страницы тарифов', status: TaskStatus.IN_REVIEW, priority: Priority.MEDIUM, assignee: 3, labels: ['вёрстка'] },
    { title: 'Интеграция с ЮKassa: тестовые оплаты', status: TaskStatus.IN_REVIEW, priority: Priority.HIGH, assignee: 2, labels: ['платежи', 'бэкенд'] },
    { title: 'Компонент карточки задачи', status: TaskStatus.DONE, priority: Priority.MEDIUM, assignee: 1, labels: ['разработка'] },
    { title: 'Черновик политики возвратов', status: TaskStatus.DONE, priority: Priority.LOW, assignee: 4, labels: ['документы'] },
  ];

  const orderCounters: Record<TaskStatus, number> = {
    [TaskStatus.TODO]: 0,
    [TaskStatus.IN_PROGRESS]: 0,
    [TaskStatus.IN_REVIEW]: 0,
    [TaskStatus.DONE]: 0,
  };

  const createdTasks: Awaited<ReturnType<typeof prisma.task.create>>[] = [];
  for (const t of tasksForRedesign) {
    const ord = orderCounters[t.status]++;
    createdTasks.push(
      await prisma.task.create({
        data: {
          title: t.title,
          status: t.status,
          priority: t.priority,
          orderIndex: ord,
          labels: t.labels,
          projectId: projects[0].id,
          assigneeId: users[t.assignee].id,
          dueDate: new Date('2026-06-30'),
        },
      }),
    );
  }

  // Сроки задаём относительно момента сидинга, чтобы вкладки «Мои задачи»
  // (Сегодня/На этой неделе/Просрочены) были наполнены в день съёмки.
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date();
  const due = (days: number) => new Date(now.getTime() + days * DAY);

  // Проекты «Запуск мобильного приложения» и «Маркетинговая кампания Q2 2026» —
  // реальные названия задач вместо плейсхолдеров «Задача N». Часть назначена
  // Ивану (users[0]) с разными сроками для наполнения экрана «Мои задачи».
  const tasksByProject: {
    project: (typeof projects)[number];
    tasks: { title: string; status: TaskStatus; priority: Priority; assignee: number; dueDate: Date; labels: string[] }[];
  }[] = [
    {
      project: projects[1],
      tasks: [
        { title: 'Собрать релиз-кандидат для RuStore', status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assignee: 0, dueDate: due(0), labels: ['релиз'] },
        { title: 'Протестировать push-уведомления на Android', status: TaskStatus.TODO, priority: Priority.MEDIUM, assignee: 0, dueDate: due(2), labels: ['тестирование'] },
        { title: 'Подготовить карточку приложения и иконки', status: TaskStatus.IN_REVIEW, priority: Priority.MEDIUM, assignee: 2, dueDate: due(9), labels: ['дизайн'] },
      ],
    },
    {
      project: projects[2],
      tasks: [
        { title: 'Запустить рекламу в Яндекс Директе', status: TaskStatus.TODO, priority: Priority.HIGH, assignee: 0, dueDate: due(-2), labels: ['реклама'] },
        { title: 'Подготовить серию писем для рассылки', status: TaskStatus.IN_PROGRESS, priority: Priority.MEDIUM, assignee: 1, dueDate: due(8), labels: ['контент'] },
        { title: 'Согласовать контент-план на июль', status: TaskStatus.IN_REVIEW, priority: Priority.LOW, assignee: 3, dueDate: due(15), labels: ['планирование'] },
      ],
    },
  ];
  for (const { project, tasks } of tasksByProject) {
    const counters: Record<TaskStatus, number> = {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.DONE]: 0,
    };
    for (const t of tasks) {
      createdTasks.push(
        await prisma.task.create({
          data: {
            title: t.title,
            status: t.status,
            priority: t.priority,
            orderIndex: counters[t.status]++,
            labels: t.labels,
            projectId: project.id,
            assigneeId: users[t.assignee].id,
            dueDate: t.dueDate,
          },
        }),
      );
    }
  }

  const plans = await Promise.all([
    prisma.plan.create({
      data: {
        name: 'Бесплатный',
        priceRub: 0,
        features: FREE_FEATURES as unknown as object,
      },
    }),
    prisma.plan.create({
      data: {
        name: 'Команда',
        priceRub: 790,
        features: TEAM_FEATURES as unknown as object,
      },
    }),
    prisma.plan.create({
      data: {
        name: 'Бизнес',
        priceRub: 2900,
        features: BUSINESS_FEATURES as unknown as object,
      },
    }),
  ]);

  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId: plans[1].id,
      status: SubStatus.ACTIVE,
      expiresAt: new Date('2026-12-31'),
    },
  });

  // Уведомления-упоминания. Актор ВСЕГДА отличается от получателя (упомянуть
  // самого себя нельзя). createdAt сдвигаем в прошлое для естественных меток.
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
  await prisma.notification.createMany({
    data: [
      { userId: users[0].id, type: 'mention', payload: { projectName: 'Редизайн сайта', actor: 'Мария Петрова' }, createdAt: hoursAgo(3) },
      { userId: users[0].id, type: 'mention', payload: { projectName: 'Запуск мобильного приложения', actor: 'Сергей Николаев' }, createdAt: hoursAgo(15) },
      { userId: users[0].id, type: 'mention', payload: { projectName: 'Маркетинговая кампания Q2 2026', actor: 'Елена Куликова' }, createdAt: hoursAgo(27) },
      { userId: users[1].id, type: 'mention', payload: { projectName: 'Редизайн сайта', actor: 'Иван Соколов' }, createdAt: hoursAgo(5) },
      { userId: users[2].id, type: 'mention', payload: { projectName: 'Запуск мобильного приложения', actor: 'Иван Соколов' }, createdAt: hoursAgo(8) },
    ],
  });

  // Записи журнала действий — чтобы журнал и «Последние действия» были наполнены
  // и (через резолвер названий) показывали реальные заголовки, а не «task»+cuid.
  const taskByTitle = (title: string) => createdTasks.find((t) => t.title === title);
  const logSeed: { actor: number; action: string; targetType: string; targetId?: string; h: number }[] = [
    { actor: 0, action: 'project.create', targetType: 'project', targetId: projects[0].id, h: 30 },
    { actor: 0, action: 'member.invite', targetType: 'member', targetId: memberRecords[4].id, h: 26 },
    { actor: 2, action: 'task.create', targetType: 'task', targetId: taskByTitle('Интеграция с ЮKassa: тестовые оплаты')?.id, h: 20 },
    { actor: 3, action: 'task.status.in_review', targetType: 'task', targetId: taskByTitle('Вёрстка страницы тарифов')?.id, h: 14 },
    { actor: 0, action: 'task.assignee.change', targetType: 'task', targetId: taskByTitle('Подготовить макеты главной страницы')?.id, h: 6 },
    { actor: 1, action: 'task.status.done', targetType: 'task', targetId: taskByTitle('Компонент карточки задачи')?.id, h: 1 },
  ];
  for (const e of logSeed) {
    if (!e.targetId) continue;
    await prisma.activityLog.create({
      data: {
        organizationId: org.id,
        actorId: users[e.actor].id,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        createdAt: hoursAgo(e.h),
      },
    });
  }

  console.log('✅ Данные подготовлены: организация «Команда TaskFlow», 5 пользователей, 3 проекта, 15 задач, 3 тарифа.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
