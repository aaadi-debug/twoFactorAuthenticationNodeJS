const express = require('express');
require('./db/conn');

const app = express();
const PORT = process.env.PORT || 8000;

// cors
const cors = require('cors')
app.use(cors())

const userRouter = require('./api/User')

//For accepting post from data from postman
app.use(express.json());   

app.use("/user", userRouter)


// app.use("/", (req, res) => {
//     res.send(`Hey There! It's Two Factor Authentication Using NodeJS`);
// })

app.listen(PORT, () => {
    console.log(`Listening at port no ${PORT}`);
})