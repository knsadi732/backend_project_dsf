const Joi = require('joi');

const createOrder = Joi.object({
  branchId: Joi.string().guid().allow(null),
  warehouseId: Joi.string().guid().required(),
  customerId: Joi.string().guid().required(),
  // OTIF (On Time In Full) tracking — the sales-committed delivery date,
  // compared against dispatched_at once the order actually ships.
  promisedDeliveryDate: Joi.date().iso().allow(null),
  items: Joi.array()
    .items(
      Joi.object({
        productVariantId: Joi.string().guid().required(),
        quantity: Joi.number().positive().required(),
      }),
    )
    .min(1)
    .required(),
});

const transitionStatus = Joi.object({
  status: Joi.string().valid('confirmed', 'packed', 'dispatched', 'delivered', 'completed').required(),
});

const transitionPayment = Joi.object({
  paymentStatus: Joi.string().valid('partial', 'paid', 'refunded').required(),
});

module.exports = { createOrder, transitionStatus, transitionPayment };
