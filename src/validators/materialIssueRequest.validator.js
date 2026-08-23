const Joi = require('joi');

// Warehouse staff types the exact quantity they're physically handing over
// per line — not auto-computed — capped server-side against both the
// remaining balance and current stock (see materialIssueRequest.service.js
// issue()).
const issueRequest = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        itemId: Joi.string().guid().required(),
        quantity: Joi.number().positive().required(),
      }),
    )
    .min(1)
    .required(),
});

module.exports = { issueRequest };
