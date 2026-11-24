/** Deep links a salesperson taps from a lead on a phone. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
export const smsHref = (phone: string) => `sms:${phone.replace(/[^\d+]/g, '')}`;
export const mapsHref = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
