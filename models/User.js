const mongoose = require('mongoose');

// Declare the userSchema of the Mongo model

var userSchema= new mongoose.Schema({
    fullName:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true,
        required: false
    },
    googleId: {
    type: String,
    unique: true,
    required: false
    },
   profileImage: {
        url: {
            type: String,
            default: null
        },
        public_id: {
            type: String,
            default: null
        }
    },
    phoneNumber:{
        type:String,
        required: false,
        unique: true
    },
    password:{
        type:String,
        required:true,
    },
    savedProperties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property", // Reference to Property schema
      },
    ],
    role:{
        type:String,
        default:"Home_Seeker",
        enum:["Home_Seeker","Admin","Agent","Landlord"]
    },
    otp:{
        type:String,
        default:'none',
    },
    otpExpires:{
        type:Date,
        default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    },
    isEmailVerified:{
        type:Boolean,
        default: false
    },
    verificationStatus: {
      type: String,
      enum: [
        "unverified",
        "nin_verified",
        "cac_verified",
        "premium_verified",
        "pending",
      ],
      default: "unverified",
    },
    isLogin:{
        type:Boolean,
        default: false
    },
    address:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Address",
        require:false
    },
    isBlocked:{
        type:Boolean,
        default: false
    },
    passwordChangedDate:{
        type:Date,
        required: false, // Not required initially
    },
    passwordResetExpires:{
        type:Date,
        required: false, // Not required initially
    },
    passwordResetToken:{
        type:String,
        required: false, // Not required initially
    }
},{ timestamps: true }
);

//Export the model
const User= mongoose.model('User', userSchema);
module.exports =User;