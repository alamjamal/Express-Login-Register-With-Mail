require('rootpath')();
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('_helpers/jwt');
const errorHandler = require('_helpers/error-handler');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const morgan = require('morgan')
const rfs = require("rotating-file-stream");
// app.use(morgan('combined'))
const rfsStream = rfs.createStream("access.log", {
    size: '10M', // rotate every 10 MegaBytes written
    interval: '1d', // rotate daily
    compress: 'gzip' // compress rotated files
 })

app.use(morgan('combined', { stream: rfsStream }))


// use JWT auth to secure the api
app.use(jwt());

// api routes
app.use('/users', require('./route/user.route'));



// global error handler
app.use(errorHandler);





// start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;
const server = app.listen(port, function () {
    console.log('Server listening on port ' + port);
});
