import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatTimeAgo(date) {
  if (!date) {
    return '';
  }
  return formatDistance(new Date(date), new Date(), { addSuffix: true, locale: es });
}
