const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const UserOTPVerificationSchema = new Schema({
    userId: {        //automatically generated ID of user
        type: String,
        required: true
    },
    otp: {
        type: String,
    },
    createdAt: {     //time
        type: Date,
        required: true
    },
    expiresAt: {     //time
        type: Date,
        required: true
    }
})

const UserOTPVerification = mongoose.model("UserOTPVerification", UserOTPVerificationSchema);
module.exports = UserOTPVerification;