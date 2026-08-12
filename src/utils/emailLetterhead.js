// Static registered-office / statutory details for DS Footwear (single-tenant
// ERP instance) — mirrors src/utils/pdfLetterhead.js on the frontend so every
// outbound document (PDF or email) carries the same letterhead.
const REGISTERED_OFFICE = 'DS Footwears, Committee Hall, Panagarh Bazar, Panagarh, Durgapur, West Bengal - 714133';
const PHONE = '+91-9144024857';
const EMAIL = 'shristyadityasingh1996@gmail.com';
const PAN = 'IMWPD8040N';
const PROPRIETOR = 'Mamta Singh';

/**
 * Wraps a notification body in the DS Footwear letterhead so every email
 * leaving the ERP — payment advices, order confirmations, bill notices — is
 * branded rather than a bare line of text.
 */
function wrapWithLetterhead(bodyText) {
  const bodyHtml = String(bodyText)
    .split('\n')
    .map((line) => `<p style="margin:0 0 10px;">${line}</p>`)
    .join('');

  return `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#141414;">
      <div style="border-bottom:3px solid #0f1e46;padding-bottom:10px;margin-bottom:16px;">
        <div style="font-size:18px;font-weight:bold;color:#0f1e46;">DS FOOTWEAR</div>
        <div style="font-size:11px;font-style:italic;color:#787878;margin-bottom:6px;">Step Into Excellence</div>
        <div style="font-size:10px;color:#3c3c3c;">Registered Office: ${REGISTERED_OFFICE} | Phone: ${PHONE}</div>
        <div style="font-size:10px;color:#3c3c3c;">Email: ${EMAIL}</div>
        <div style="font-size:10px;font-weight:bold;color:#3c3c3c;">PAN: ${PAN} | Proprietor: ${PROPRIETOR}</div>
      </div>
      <div style="font-size:13px;line-height:1.5;">${bodyHtml}</div>
      <div style="margin-top:20px;padding-top:10px;border-top:1px solid #d2d2d2;font-size:10px;color:#969696;">
        This is an automated message from DS Footwear ERP.
      </div>
    </div>
  `;
}

module.exports = { wrapWithLetterhead };
