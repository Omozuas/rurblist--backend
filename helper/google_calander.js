module.exports.generateGoogleCalendarLink = ({
  title,
  description,
  location,
  startDate,
  endDate,
}) => {
  const formatDate = (date) => new Date(date).toISOString().replace(/-|:|\.\d+/g, '');

  return `https://www.google.com/calendar/render?action=TEMPLATE
  &text=${encodeURIComponent(title)}
  &details=${encodeURIComponent(description)}
  &location=${encodeURIComponent(location)}
  &dates=${formatDate(startDate)}/${formatDate(endDate)}`;
};
