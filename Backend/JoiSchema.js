const Joi = require("joi");

const phone = Joi.string().trim().pattern(/^[6-9]\d{9}$/).required();

const signupSchema = Joi.object({
  fullName: Joi.string().trim().min(3).max(100).required(),
  phone,
  password: Joi.string().min(6).max(50).required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords must match."
  }),
  role: Joi.string().valid("Farmer", "Driver").default("Farmer"),
  location: Joi.string().trim().max(200).allow(""),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional()
});

const loginSchema = Joi.object({
  phone,
  password: Joi.string().min(1).max(50).required()
});

module.exports = { signupSchema, loginSchema };
