require('dotenv').config()
const token_secret=process.env.TOKEN_SECRET
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User , Hash} = require('_helpers/db');
const userValidate = require("../validation/user.validate");
// const User = db.User;
const {accountVerification, passwordReset} = require("../_helpers/emailTemplates")
const mailgun = require("mailgun-js");
const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN });

module.exports = {
    login,
    register,
    getAll,
    getCurrent,
    getById,
    updateById,
    deleteById: _delete,
    getByIdForJWT,
    activateAccount,
    forgotPasswordLink,
    changePassword
};

async function register(req, res) {
    const { error } = await userValidate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    let user = await User.findOne({ email: req.body.email });
    
    // console.log(user);
    if (user) {
        if (user.isActivate) return res.status(400).json({ message: "Email Already Taken" });
        let hash = await Hash.findOne({ userId: user._id});
        if (hash) return res.status(400).json({ message: "Link Already Sent" });
        if (!hash) return res.status(400).json({ message: "Link Expired Please Resend " });
    }

    const password = bcrypt.hashSync(req.body.password, 10);
    user = await new User({...req.body, password:password}).save()
    const hashString = bcrypt.hashSync(Math.random().toString(36).slice(2, 10), 10);
    hashdata =await new Hash({userId:user.id, hashString:hashString}).save()
    const token = jwt.sign({id:user.id,hashString:hashString}, token_secret, { expiresIn: '10m' });
    const output = accountVerification(token)
    const data = {
        from: 'alam@manuu.edu.in',
        to: user.email,
        subject: 'account verification',
        html: output
    };
    await mg.messages().send(data, function (error, body) {
        if (error) {
            user.remove()
            hashdata.remove()
            return res.status(400).json({ error: error, message: "Message Not Sent" });
        }
        return res.status(200).json({ message: "Activation Link Sent To Your Mail Id, Kindly Activate Your Account" });
    });
}

async function resendLink(req, res){
    let user = await User.findOne({ email: req.body.email });
}

async function activateAccount(req, res) {
    const token = req.params.id.trim()
    if (token) {
         jwt.verify(token, token_secret, async function (err, decodedToken) {
            if (err) return res.status(400).json({ message: "Incorrect or Expire Token" })
            const {id , hashString} = decodedToken
            const user = await User.findById(id);
            if(!user) return res.status(400).send({ message: "User Not Found" });
            if (user.isActivate) return res.status(400).send({ message: "Already Activated" });
            const hash = await Hash.findOne({userId: user.id, hashString:hashString});
            if (!hash) return res.status(400).send({ message: "Token Expired Please Resend Verification link"});
            const token = jwt.sign({ currentId: user.id }, token_secret, { expiresIn: '7d' });
            await User.findByIdAndUpdate(id, {isActivate:true}, { new: true })
            .then(user => user ? res.json({ ...user.toJSON(),token,message: "Account Activated Successfully" }) : res.status(404).json({ message: 'User Not Found' }))
            .catch(err => res.json({ message: err.message }));

		    await hash.remove();
        })
    }
    else return res.status(400).json({ message: "Token Error" })
}

async function forgotPasswordLink(req, res) {
    const email = req.body.email
    await User.findOne({ email })
        .then((user) => {
            if(!user) return res.status(200).json({meaasge:"user not found" }) 
            const token = jwt.sign({id:user.id}, token_secret, { expiresIn: '1d' });
            const output = passwordReset(token)
            const data = {
                from: 'alamjamal88@gmail.com',
                to: user.email,
                subject: 'password change',
                html: output
            };
            mg.messages().send(data, function (error, body) {
                if (error) return res.status(400).json({ error: error, message: "Message Not Sent" });
                return res.status(200).json({ message: "Password Reset Link Sent To Your Mail Id, Kindly Check Your Account" });
            });
        })
    .catch((err) => res.status(200).json({ err: err.message}))
}


async function changePassword(req, res) {
    const token = req.params.id
    let password = req.body.password
    if(!password) return res.status(400).json({ message: "Provide Password" })
    if (token) {
        jwt.verify(token, token_secret, async function (err, decodedToken) {
            if (err) return res.status(400).json({ message: "Incorrect or Expire Token" })
            const {id} = decodedToken
            if(!id) return res.status(400).json({ message: "Incorrect or Expire Token" })
            const token = jwt.sign({ currentId: id }, token_secret, { expiresIn: '7d' });
            password = bcrypt.hashSync(password, 10);
            await User.findByIdAndUpdate(id, {password:password}, { new: true })
            .then(user => user ? res.json({ ...user.toJSON(), token, message: "Password Changed Successfully" }) : res.status(404).json({ message: 'User Not Found' }))
            .catch(err => res.json({ message: err.message }));
        })
    }
    else return res.status(400).json({ message: "Token Error" })
}

async function login(req, res) {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    if (user && bcrypt.compareSync(password, user.password)) {
        if (!user.isActivate) return res.status(400).json({ message: "Activate Your Account" });
        const token = jwt.sign({ currentId: user.id }, token_secret, { expiresIn: '7d' });
        res.status(200).json({ ...user.toJSON(), token })
    } else res.status(403).json({ message: 'Username or Password is Incorrect' })
}


async function getAll(req, res) {
    await User.find()
        .then(users => res.status(200).json(users))
        .catch(err => res.json({ message: err.message }));
}

async function getCurrent(req, res) {
    await User.findById(req.user.currentId)
        .then(user => user ? res.status(200).json(user) : res.status(404).json({ message: 'User Not Found' }))
        .catch(err => res.json({ message: err.message }));
}

async function getByIdForJWT(id) {
    return await User.findById(id);
}


async function getById(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ message: 'Not a Valid id' });
    await User.findById(req.params.id)
        .then(user => user ? res.status(200).json(user) : res.status(404).json({ message: 'User Not Found' }))
        .catch(err => res.json({ message: err.message }));
}

async function updateById(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ message: 'Not a Valid id' });
    const { error } = await userValidate(req.body);
    if (error) return res.status(400).json(error.message);
    const user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).json({message: "Email Already Taken Or id is Invalid"});
    // if (req.body.password) return res.status(400).json({message:"Password Cannot be Updated"});
    await User.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then(user => user ? res.json({ ...user.toJSON(), message: "User Updated Successfully" }) : res.status(404).json({ message: 'User Not Found' }))
    .catch(err => res.json({ message: err.message }));
}


async function _delete(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ message: 'Not a Valid id' });
    await User.findByIdAndRemove(req.params.id)
    .then(user => user ? res.status(200).json({ message: 'User Deleted Successfully' }) : res.status(404).json({ message: 'User Not Found' }))
    .catch(err => res.json({ message: err.message }));
}


