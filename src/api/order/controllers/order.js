const stripeInstance = require("stripe");
const stripe = stripeInstance(process.env.STRIPE_KEY);

("use strict");

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { cart } = ctx.request.body;
    console.log(11)
    if (!cart) {
      ctx.response.status = 400;
      return { error: "Cart not found in request body" };
    }

    const lineItems = await Promise.all(
      cart.map(async (product) => {
        const item = await strapi.entityService.findOne(
          "api::product.product",
          product.id,
          {
            fields: ["name", "price"],
            populate: "*",
          }
        );
        console.log(item.image.url);
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
              images: [item.image.url],
            },
            unit_amount: item.price * 100,
          },
          quantity: product.quantity,
        };
      })
    );
    console.log(12)
    try {
      console.log(13)
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}success`,
        cancel_url: `${process.env.CLIENT_URL}fail`,
        shipping_address_collection: {
          allowed_countries: ["US"],
        },
      });
      console.log(14)

      await strapi.service("api::order.order").create({
        data: {
          products: cart,
          stripeId: session.id,
        },
      });
      console.log(15)

      return { stripeSession: session };
    } catch (error) {
      console.log(error)
      ctx.response.status = 500;
    }
  },
}));
