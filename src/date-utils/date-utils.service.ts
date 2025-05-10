import { Injectable } from '@nestjs/common';

// Добавит 0, если это цифра, а не число. (Пример: 9 -> 09)
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const monthNames = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

@Injectable()
export class DateUtilsService {
  formatDate(date: Date): string {
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const day = pad(date.getDate());
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return `${hours}:${minutes} | ${day} ${month} ${year}`;
  }
}
