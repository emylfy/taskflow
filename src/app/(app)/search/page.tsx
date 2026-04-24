import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import { StatusPill } from '@/components/ui/Badge';
import styles from './search.module.css';

export const metadata = { title: 'Поиск — TaskFlow' };

export default function SearchPage() {
  return (
    <div className={styles.page}>
      <div className={styles.modal}>
        <div className={styles.input}>
          <I.Search size={20} stroke="#5B6670" />
          <input defaultValue="макет" placeholder="Поиск по задачам, проектам, участникам…" />
          <span className={styles.esc}>Esc</span>
        </div>
        <div className={styles.results}>
          <div className={styles.group}>
            <div className={styles.groupHead}>
              <span>Задачи</span>
              <span className={styles.groupCount}>· 4</span>
            </div>
            <div className={`${styles.row} ${styles.rowActive}`}>
              <I.CheckCircle size={16} stroke="#5B6670" />
              <div className={styles.rowInfo}>
                <div className={styles.rowTitle}>
                  Подготовить <mark className={styles.hl}>макет</mark>ы главной страницы
                </div>
                <div className={styles.rowSub}>Редизайн сайта · Иван Соколов</div>
              </div>
              <StatusPill status="doing" size="sm" />
            </div>
            <div className={styles.row}>
              <I.CheckCircle size={16} stroke="#5B6670" />
              <div className={styles.rowInfo}>
                <div className={styles.rowTitle}>
                  Ревью <mark className={styles.hl}>макет</mark>ов раздела тарифов
                </div>
                <div className={styles.rowSub}>Редизайн сайта · Мария Петрова</div>
              </div>
              <StatusPill status="review" size="sm" />
            </div>
            <div className={styles.row}>
              <I.CheckCircle size={16} stroke="#5B6670" />
              <div className={styles.rowInfo}>
                <div className={styles.rowTitle}>
                  Собрать <mark className={styles.hl}>макет</mark>ы в прототип Figma
                </div>
                <div className={styles.rowSub}>Запуск мобильного приложения · Елена Куликова</div>
              </div>
              <StatusPill status="todo" size="sm" />
            </div>
          </div>

          <div className={styles.group}>
            <div className={styles.groupHead}>
              <span>Проекты</span>
              <span className={styles.groupCount}>· 1</span>
            </div>
            <div className={styles.row}>
              <ProjectIcon name="Редизайн сайта" size={22} />
              <div className={styles.rowInfo}>
                <div className={styles.rowTitle}>Редизайн сайта</div>
                <div className={styles.rowSub}>48 задач · 5 участников · Активен</div>
              </div>
            </div>
          </div>

          <div className={styles.group}>
            <div className={styles.groupHead}>
              <span>Участники</span>
              <span className={styles.groupCount}>· 2</span>
            </div>
            <div className={styles.row}>
              <Avatar name="Мария Петрова" size={24} />
              <div className={styles.rowInfo}>
                <div className={styles.rowTitle}>Мария Петрова</div>
                <div className={styles.rowSub}>Дизайнер · maria.petrova@taskflow.ru</div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.foot}>
          <span>
            <kbd className={styles.kbd}>↑↓</kbd> выбрать
          </span>
          <span>
            <kbd className={styles.kbd}>⏎</kbd> открыть
          </span>
          <div style={{ flex: 1 }} />
          <span>Поиск по организации «Команда TaskFlow»</span>
        </div>
      </div>
    </div>
  );
}
