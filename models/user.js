const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/miniproject")

const userSchema = new mongoose.Schema({ //SCHEMA of the user mens in tis format only the data will be stored i  the database
    username:String,
    name:String,
    age:Number,
    email:String,
    password:String,
    Profilepic:{ //profile pic is the string typr with stored as a default pic
        type:String,
        default:"Profilepic.jpg" 
    },
    posts:[ //post is also the ids of objectid with ref post
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"post"
        } 
    ]
})

module.exports = mongoose.model("user",userSchema); //exporting to use all the data in the app.js