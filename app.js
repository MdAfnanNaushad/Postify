const express = require('express') //requiring express because without express app cannot be set or listen on port
const app = express(); //calling express app to require all its function
const userModel = require("./models/user"); //this is the userModel Schema which is required from the folder named models inside user file
const postModel = require("./models/post") ////this is the postModel Schema which is required from the folder named models inside post file
const cookieParser = require('cookie-parser');  //we have to require cookie-parser to read the data in the readable form
const bcrypt = require('bcrypt'); //requiring bcrypt for authentication
const jwt = require("jsonwebtoken") // for Authorization
app.set("view engine", "ejs"); //setting up view engine as ejs
app.use(express.json());  // converting data into json format
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); //using functionalities of Cookie parser
const crypto = require('crypto'); //Crypto is a functio or package in nodemodules used 
const path = require('path') //
app.use(express.static(path.join(__dirname, "public")))
const upload = require('./config/multerconfig')
const session = require('express-session');

app.use(session({
    secret: 'your-secret-key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

//Set method is used when we have to give the data to the server,resulting in thechange of state or have some effect in the frontend part

//Get method is used when we have to take information from the server,resulting in parametrs visible thorugh the url


app.get("/", (req, res) => {//main route  in which our user creation or Account Creation page is rendered
    res.render("index") //render is a method in ejs to show the page as a frontend part
})
app.get("/login", (req, res) => { //this is a login page route so that our user dont need to create every time their account
    res.render("login")
})
app.get("/profile", isloggedIn, async (req, res) => { //this is the Profile route in which user can see its total post and othe related data such as like or if they want to edit their post so that they can also do it
    let user = await userModel.findOne({ email: req.user.email }).populate("posts");//here we are finding the user on the basis of the email stored in the database, the user can only go to the profile if he is login or priorly registered if not then how can one go to the profile without having an account
    res.render("profile", { user });  //if the emil is mathe with the database storedthen the user can go to the profile route with his/her name attached
}) //We have also attached a middleware naed IsLoggedin in this route to verify if the user is present in the database or not through cookie verificationa as well as secret jey verification process discussed below
app.get("/profile/upload", (req, res) => { // route for uploading anything or any post in the route
    res.render("profileupload") //showinthe user that profile uploaded
}) //profile photo will be uploded using this route

app.post('/profile/upload', isloggedIn, upload.single('profilepic'), async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Unauthorized: User not logged in");
    }

    const userId = req.session.user._id;
    await userModel.findByIdAndUpdate(userId, { Profilepic: req.file.filename });
    const updatedUser = await userModel.findById(userId).populate('posts');
    req.session.user = updatedUser;
    res.render('profile', { user: updatedUser });
});


app.post("/upload", isloggedIn, upload.single("image"), async (req, res) => { //route for uploading the image in the profile
    let user = await userModel.findOne({ email: req.user.email });//find the user on the basis of emaila nd from userModel Schema
    user.Profilepic = req.file.filename; //
    await user.save(); //for written by the admin we have to write save() methos to manually save the changes happen
    res.redirect("/profile"); //after all the procedure or operatins happening simply rediecting back the user into the profile route to ba able to see the changes
})




app.get("/like/:id", isloggedIn, async (req, res) => { //if any othe user want to like a paticular userid then he/she can do it in this route
    let post = await postModel.findOne({ _id: req.params.id }).populate("user"); //finding if the post exist on the basis of _id
    const likeIndex = post.likes.indexOf(req.user.userid); //calculating the indexof the likes array (see the post model likes is the array f ids)

    if (likeIndex === -1) { //if there is no likes
        post.likes.push(req.user.userid); // Add like
    } else {
        post.likes.splice(likeIndex, 1); // Remove like (splice means remove with the number giiven here it is one)
    }

    await post.save(); //manually saving
    res.redirect("/profile"); ///.redirecting to the profile route
    console.log(req.user);//log the user
});// other user can loke one post

app.get("/edit/:id", isloggedIn, async (req, res) => { // 
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");//populate method is used to replace the previous with the new one
    res.render("edit", { post }); // finding the user's post on the basis of _id and populate/replacing with the current updated id rendering in the edit oage
}); //post will be edited in this route

app.post("/update/:id", isloggedIn, async (req, res) => { //this is the update post in which user if want to update his/her written post so it can be done in this rute
    let post = await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content }) //if the user exist only the he can update therefore finding user's post on the basis of id and updating the previous content with the new one
    res.redirect("/profile"); //after updating redirecting the user into he profilr route
});

app.post("/post", isloggedIn, async (req, res) => { //thi is the route for the user to post anything in his/her profile
    let user = await userModel.findOne({ email: req.user.email }); //finding the user on the basis of email and id if the user found then only he can post 
    let { content } = req.body; //content coming from ejs or frontent to req.body and it is being stored
    let post = await postModel.create({ ////creating post o the baissi of postModel Schema and shoeing in the frontend in the form of userid and content the user has been written
        user: user._id,
        content
    });
    user.posts.push(post._id); //pushing the user's >_id for referencing into the array of posts (post.js file in models)
    await user.save(); //manually saving
    res.redirect("/profile") //after creation of the post we are reirecting the user into its profile route to see its just posted pot
})
app.post("/register", upload.single("profilepic"), async (req, res) => { //this is the post route in which we only ensure the user that he/she has successfully registered after passing through the main route
    let { email, password, username, name, age,Profilepic } = req.body //extracting the data as email,name password username in the req.body
    console.log(req.body);  //logging the req.body
    let user = await userModel.findOne({ email: email }); // finding the user on the basis of the email
    if (user) return res.status(500).send("user already registered"); //if the user has already registers and he is again trying to create account with the same credentials then he has shown ("user already registered")

    bcrypt.genSalt(10, (err, salt) => { // Bcrypt is a password hashing function need to install from external sources,her we are generating the password and converting it into random string with the help of salt and Bcrypt SALT add a unique value adding feature at the end of the hashed password
        bcrypt.hash(password, salt, async (err, hash) => { //10 is the salt rounds,in this function we re hashing the password
            let user = await userModel.create({ //creatig the user on the basisi of the userModel See folederStructure
                username,
                email,
                age,
                name,
                Profilepic,
                password: hash  //this is the hashing technique to hashed the require password
            });
            let token = jwt.sign({ email: email, userid: user._id }, "shhhhhhhh"); //jwt is a method in jsonwebtoken to create a token for authorization ,it requires a payload(on the basis of which you have to create  a token) and a secret key  
            res.cookie("token", token); //setting cookie  on the basis of token variable (cookie is a random string whichh is tranferred when the use sends a request to the server so that for performing one task he should not have to login again)
            res.redirect("/profile") //Showig the user that he/she is registered
        })
    })

})

app.post("/login", async (req, res) => { //this is the login route to check if the user is already pred=sent in the database or not
    let { email, password } = req.body //extracting the email and psswird of the user whichis require for login in the login page
    console.log(req.body);  //showing thedata after logging
    let user = await userModel.findOne({ email: email }); //finding the user on the bsis of email
    if (!user) return res.status(500).send("User not Found"); //if not found

    bcrypt.compare(password, user.password, (err, result) => { //Comparing the user's password with the databse and sending the output n result
        if (result) { //if true

            let token = jwt.sign({ email: email, userid: user._id }, "shhhhhhhh"); //ceating json webtoken with secret key on the basis of email and _id
            res.cookie("token", token); //to set token whether if it is register or log in
            res.status(200).redirect("/profile"); //f the user is found the redirecting to its profile page
        }
        else res.redirect("/login"); //if not found the redirecting to login page
    }) //password jo hai wo user login page me enter krr rha hai
})                                         // user.password jo hai wo user ka already given ya logged password hai jo usne account create krte waqt bnaya tha 

app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
})

function isloggedIn(req, res, next) {
    if (!req.cookies.token) return res.redirect("/login");

    try {
        let data = jwt.verify(req.cookies.token, "shhhhhhhh");
        req.user = data;

        // Fetch the user from the database and set it in the session
        userModel.findById(data.userid).then(user => {
            req.session.user = user; // Set the user in the session
            next();
        }).catch(err => {
            console.error(err);
            res.redirect("/login");
        });
    } catch (err) {
        console.error(err);
        res.redirect("/login");
    }
}


app.listen(3000);
console.log("Listening on Port 3000")