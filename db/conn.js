const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONOGODB_URI, {
    useNewUrlParser: true
})
.then(() => {
    console.log(`Database is Connected...`);
})
.catch((err) => {
    console.log(`Data not Connected!`, err);
})