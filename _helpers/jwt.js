require('dotenv').config()
const expressJwt = require('express-jwt');
const control = require('../controller/user.controller')
module.exports = jwt;

function jwt() {
    const secret = process.env.TOKEN_SECRET
    return expressJwt({ secret, algorithms: ['HS256'], isRevoked }).unless({
        path: [
            
            // {url: '/users/activate'},
            {url: '/users/login'},
            {url: '/users/register'},
            {url: /^\/users\/activate\/.*/},
            {url: '/users/forgotpassword'},
            {url: /^\/users\/changepassword\/.*/}
        ]
    });
}

async function isRevoked(req, payload, done) {
    const user = await control.getByIdForJWT(payload.currentId);

    // revoke token if user no longer exists
    if (!user) {
        return done(null, true);
    }
    done();
};