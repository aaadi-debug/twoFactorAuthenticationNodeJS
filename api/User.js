const express = require('express');
const router = express.Router();

// mongoDB userSchema
const User = require('./../models/User');

// mongoDB userVerification model
// const UserVerification = require('./../models/UserVerification');

// mongoDB userOTPVerification model
const UserOTPVerification = require('./../models/UserOTPVerification');

// mongoDB user model
// const PasswordReset = require('./../models/PasswordReset');

// email handler
const nodemailer = require('nodemailer');

// unique string
const { v4: uuidv4 } = require('uuid');

// env variables
require('dotenv').config();

// password handler
const bcrypt = require('bcryptjs');

// path for static verified page
const path = require("path");

// nodemailer 
let transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
})

// trasporter testing
transporter.verify((error, success) => {
    if(error) {
        console.log("False:", error);
    } else {
        console.log("Ready for Msessages");
        console.log("success:", success);
    }
})

//Signup api
router.post("/signup", (req, res) => {
    let { name, email, password, dateOfBirth } = req.body;

    // validation
    if(name == "" || email == "" || password == "" || dateOfBirth == "") {
        return res.status(403).json({ message: "Cannot be Empty" })
    } 
    // else if(!/^[a-zA-z]*$/.test(name)) {
    //     return res.status(403).json({ message: "Invalid Name" })
    // } else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    //     return res.status(403).json({ message: "Invalid Email" })
    // } else if(!new Date(dateOfBirth).getTime()) {
    //     return res.status(403).json({ message: "Invalid DOB" })
    // } else if(password.length < 8) {
    //     return res.status(403).json({ message: "Password length should be atleast 8 characters" })
    // } 
    else {
        // checking if user already exists
        User.find({ email })
            .then((result) => {
                if(result.length) {
                    // user already exists
                    return res.status(403).json({ message: "User Already Exists" })
                } else {
                    // try to create new user

                    //password hashing
                    const saltRounds = 10;
                    bcrypt
                        .hash(password, saltRounds)
                        .then((hashedPassword) => {
                            // creating new user
                            const newUser = new User({
                                name,
                                email,
                                password: hashedPassword,
                                dateOfBirth,
                                verified: false
                            });

                            newUser
                                .save()
                                .then((result) => {
                                    // return res.status(200).json({ 
                                    //     message: "Signup Successful",
                                    //     data: result
                                    // })
                                    
                                    // handle OTP verification
                                    sendOTPVerificationEmail(result, res);
                                })
                                .catch((err) => {
                                    return res.status(403).json({ message: "An error occured while saving user account!" })
                                })
                        })
                        .catch((err) => {
                            return res.status(403).json({ message: "An error ocuured while hashing password!" })
                        })
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(403).json({ message: "An error occured while checking for existing user!" })
            })
    }
});

// send otp verification email
const sendOTPVerificationEmail = async ({ _id, email }, res) => {
    try {
        // generating OTP
        // math.random gives bw 0 to 1(exclusive)
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to : email,
            subject: "verify Your Email",
            html: 
            `   <p>Enter <b>${otp}</b> in the app to verify your email address and complete the signup</p>
            <p>This code <b>expires in 1 Hour</b></p>
            `
        };

        // hash the otp
        const saltRounds = 10;
  
        const hashedOTP = await bcrypt.hash(otp, saltRounds);
        const newOTPVerification = await new UserOTPVerification({
            userId: _id,
            otp: hashedOTP,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000  // adding 1hr to milliseconds to current time
        });

        // save otp record
        await newOTPVerification.save();
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ 
            message: "OTP Verification Email Sent",
            data: {
                userId: _id,
                email
            }
        });

    } catch(err) {
        console.log(err);
        return res.status(403).json({ message: err.message });
    }
}

// verify otp email
router.post("/verifyOTP", async (req, res) => {
    try {
        let { userId, otp } = req.body;
        if(!userId || !otp) {
            throw Error("Empty otp details are not allowed");
        } else {
            const UserOTPVerificationRecords = await UserOTPVerification.find({
                userId,
            });
            if(UserOTPVerificationRecords.length <= 0) {
                // no record found
                throw new Error(
                    "Account record doesn't exist or has been verified already. Please sign up or log in."
                )
            } else {
                // user otp record exists
                const { expiresAt } = UserOTPVerificationRecords[0];
                const hashedOTP = UserOTPVerificationRecords[0].otp;

                if(expiresAt < Date.now()) {
                    // user otp record has expired
                    await UserOTPVerification.deleteMany({ userId });
                    throw new Error("Code has expired. Please request again.");
                } else {
                    const validOTP = await bcrypt.compare(otp, hashedOTP);

                    if(!validOTP) {
                        // supplied otp is wrong
                        throw new Error("Invalid code passed. Check you passed.")
                    } else {
                        // success
                        await User.updateOne({ _id: userId }, { verified: true });
                        UserOTPVerification.deleteMany({ userId });
                        return res.status(200).json({ message: "User Email Verified Successfully." })
                    }
                }
            }
        }

    } catch(err) {
        return res.status(403).json({ message: err.message })
    }
});

// resend verification
router.post("/resendOTPVerificationCode", async (req, res) => {
    try {
        let { userId, email } = req.body;

        if(!userId || !email) {
            throw Error("Empty user details are not allowed");
        } else {
            // delete existing records and resend
            await UserOTPVerification.deleteMany({ userId });
            sendOTPVerificationEmail({ _id: userId, email }, res);
        }

    } catch(err) {
        console.log(err);
        return res.status(403).json({ message: err.message });   
    }
});

module.exports = router;