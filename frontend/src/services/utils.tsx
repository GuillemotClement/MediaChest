export const convertMinuteToHour = (totalMinute: number) => {
  const hours = Math.floor(totalMinute / 60);
  const minutes = totalMinute % 60;

  return `${hours}h${minutes.toString().padStart(2, '0')}min`;
};

export const displayDateFr = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};
