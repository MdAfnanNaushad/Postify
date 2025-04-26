const mongoose = require("mongoose");

const postSchema = mongoose.Schema({ //Schema for the post
    user:{
        type:mongoose.Schema.Types.ObjectId, //user stored in the array of ids taking/having reference from the user
        ref:"user"
    },
    date:{ //time and Date of the post posted
        type:Date,
        default:Date.now
    },
    content:String, //Content will be stored in the form of String
    likes:[{ //likes is the array of ids with reference of having user
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    }]
    
});

module.exports = mongoose.model("post",postSchema); //exporting so that we can use in app.js