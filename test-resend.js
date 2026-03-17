const { Resend } = require('resend');
try {
  const resend = new Resend(undefined);
  console.log('Resend initialized');
} catch (e) {
  console.error('Resend initialization failed:', e.message);
}
