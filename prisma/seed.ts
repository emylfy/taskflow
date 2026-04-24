import { PrismaClient, MemberRole, TaskStatus, Priority, SubStatus } from '@prisma/client';

const prisma = new PrismaClient();

const STATUS_ORDER: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];

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
    { name: 'Иван Соколов', email: 'ivan.sokolov@taskflow.ru', role: MemberRole.OWNER },
    { name: 'Мария Петрова', email: 'maria.petrova@taskflow.ru', role: MemberRole.ADMIN },
    { name: 'Сергей Николаев', email: 'sergey.nikolaev@taskflow.ru', role: MemberRole.MEMBER },
    { name: 'Елена Куликова', email: 'elena.kulikova@taskflow.ru', role: MemberRole.MEMBER },
    { name: 'Тимур Белов', email: 'timur.belov@taskflow.ru', role: MemberRole.MEMBER },
  ];

  const users = [];
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        emailVerified: true,
      },
    });
    await prisma.member.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: u.role,
      },
    });
    users.push(user);
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
    { title: 'Подготовить макеты главной страницы', status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assignee: 1 },
    { title: 'Согласовать техническое задание с заказчиком', status: TaskStatus.TODO, priority: Priority.CRITICAL, assignee: 0 },
    { title: 'Обновить схему базы данных под отчёты', status: TaskStatus.TODO, priority: Priority.MEDIUM, assignee: 2 },
    { title: 'Провести исследование пользователей', status: TaskStatus.TODO, priority: Priority.MEDIUM, assignee: 3 },
    { title: 'Настроить развёртывание через Docker Compose', status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assignee: 2 },
    { title: 'Вёрстка страницы тарифов', status: TaskStatus.IN_REVIEW, priority: Priority.MEDIUM, assignee: 3 },
    { title: 'Интеграция с ЮKassa: тестовые оплаты', status: TaskStatus.IN_REVIEW, priority: Priority.HIGH, assignee: 2 },
    { title: 'Компонент карточки задачи', status: TaskStatus.DONE, priority: Priority.MEDIUM, assignee: 1 },
    { title: 'Черновик политики возвратов', status: TaskStatus.DONE, priority: Priority.LOW, assignee: 4 },
  ];

  const orderCounters: Record<TaskStatus, number> = {
    [TaskStatus.TODO]: 0,
    [TaskStatus.IN_PROGRESS]: 0,
    [TaskStatus.IN_REVIEW]: 0,
    [TaskStatus.DONE]: 0,
  };

  for (const t of tasksForRedesign) {
    const ord = orderCounters[t.status]++;
    await prisma.task.create({
      data: {
        title: t.title,
        status: t.status,
        priority: t.priority,
        orderIndex: ord,
        projectId: projects[0].id,
        assigneeId: users[t.assignee].id,
        dueDate: new Date('2026-06-30'),
      },
    });
  }

  for (const [i, p] of projects.slice(1).entries()) {
    for (let j = 0; j < 3; j++) {
      await prisma.task.create({
        data: {
          title: `Задача ${j + 1} проекта «${p.name}»`,
          status: STATUS_ORDER[j % STATUS_ORDER.length],
          priority: Priority.MEDIUM,
          orderIndex: j,
          projectId: p.id,
          assigneeId: users[(i + j) % users.length].id,
        },
      });
    }
  }

  const plans = await Promise.all([
    prisma.plan.create({
      data: {
        name: 'Бесплатный',
        priceRub: 0,
        features: ['До 3 пользователей', 'До 2 проектов', 'Канбан и комментарии'],
      },
    }),
    prisma.plan.create({
      data: {
        name: 'Команда',
        priceRub: 1500,
        features: ['До 20 пользователей', 'Безлимит проектов', 'Совместное редактирование', 'История версий'],
      },
    }),
    prisma.plan.create({
      data: {
        name: 'Бизнес',
        priceRub: 4500,
        features: ['Без ограничений', 'SLA 99,9 %', 'Единый вход (SSO)', 'Приоритетная поддержка'],
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

  await prisma.notification.createMany({
    data: users.slice(0, 3).map((u) => ({
      userId: u.id,
      type: 'mention',
      payload: { projectName: 'Редизайн сайта', actor: 'Иван Соколов' },
    })),
  });

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
