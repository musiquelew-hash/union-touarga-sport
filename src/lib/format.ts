const dateFormatter = new Intl.DateTimeFormat("fr-MA", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Casablanca",
});

const timeFormatter = new Intl.DateTimeFormat("fr-MA", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Casablanca",
});

const shortDateFormatter = new Intl.DateTimeFormat("fr-MA", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "Africa/Casablanca",
});

export function formatDate(timestamp: number) {
  return dateFormatter.format(new Date(timestamp * 1000));
}

export function formatShortDate(timestamp: number) {
  return shortDateFormatter.format(new Date(timestamp * 1000)).replace(".", "");
}

export function formatTime(timestamp: number) {
  return timeFormatter.format(new Date(timestamp * 1000));
}

export function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("fr-MA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  }).format(new Date(value));
}