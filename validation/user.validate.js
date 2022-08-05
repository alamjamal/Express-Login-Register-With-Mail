const Joi = require('joi');
async function validateUser (data, requestType) {
    const schema = Joi.object({
        userType: Joi.string().required().valid('Educator','Parents','Principle', 'admin'),
        organisation:Joi.string(),
        firstName:Joi.string().required(),
        lastName:Joi.string(),
        email:Joi.string().email().required(),
        password:Joi.string().min(5).max(25).alter({
            //For POST request
                    post: (schema) => schema.required(),
            //For PUT request
                    put: (schema) => schema.forbidden(),
        }),
        mobile: Joi.string().min(10).max(13).required(),
        pinCode: Joi.string().min(6).max(6).required(),
        address: Joi.string().min(5).max(100)
    });
    return schema.tailor(requestType).validate(data);
}

module.exports=validateUser;