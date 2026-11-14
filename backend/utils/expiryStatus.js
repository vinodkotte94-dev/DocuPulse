
const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) {
    return "No Expiry Date";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const difference = expiry.getTime() - today.getTime();

  const daysRemaining = Math.round(
    difference / (1000 * 60 * 60 * 24)
  );

  if (daysRemaining < 0) {
    return "Expired";
  }

  if (daysRemaining === 0) {
    return "Expires Today";
  }

  if (daysRemaining <= 7) {
    return "Expiring Soon";
  }

  if (daysRemaining <= 30) {
    return "Upcoming";
  }

  return "Valid";
};

export default getExpiryStatus;
