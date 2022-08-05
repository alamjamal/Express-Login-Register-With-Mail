const express = require('express');
const router = express.Router();
const control = require('../controller/user.controller')

//route
router.post('/login', control.login);
router.post('/register', control.register);
router.get('/activate/:id', control.activateAccount);
router.get('/getall', control.getAll);
router.get('/getcurrent', control.getCurrent);
router.get('/getbyid/:id', control.getById);
router.put('/updatebyid/:id', control.updateById);
router.delete('/deletebyid/:id', control.deleteById);
router.post('/forgotpassword', control.forgotPasswordLink);
router.get('/changepassword/:id', control.changePassword);
module.exports = router;