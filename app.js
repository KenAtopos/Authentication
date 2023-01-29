const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose =  require("passport-local-mongoose");
const LocalStrategy = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const app = express();

require("dotenv").config();

app.set("view engine", "ejs");

app.use(express.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  }))

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public"));

mongoose.set('strictQuery', true);

main().catch(err => console.log(err));

async function main() {
  mongoose.connect('mongodb://127.0.0.1:27017/userDB', {
        useNewUrlParser: true
    });
}

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// const mySecret = process.env.SECRET_KEY;
// userSchema.plugin(encrypt, {secret: mySecret, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            console.log(err)
        } else {
            console.log("Successfully logged out.")
        }
    });
    res.redirect("/");
});

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] 
}));

app.get("/auth/google/secrets", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
    // Successful authentication, redirect secrets.
        res.redirect("/secrets");
    });

app.route("/login")
    .get((req, res) => {
        res.render("login");
    })
    .post((req, res) => {

        const user = new User({
            username: req.body.username,
            password: req.body.password,
        });

        req.login(user, (err) => {
            if (err) {
                console.log(err)
            } else {
                passport.authenticate("local") (req, res, () => {
                    res.redirect("/secrets")
                });
            }
        })
        // const username = req.body.username;
        // const password = req.body.password;

        // User.findOne(
        //     {email: username},
        //     (err, foundUser) => {
        //         if (err) {
        //             console.log(err);
        //         } else {
        //             if (foundUser) {
        //                 bcrypt.compare(password, foundUser.password, (err, result) => {
        //                     if (result === true) {
        //                         res.render("secrets")
        //                     } else {
        //                         res.send("Wrong password.")
        //                     }
        //                 });
        //             } else {
        //                 res.send("User not found.")
        //             }
        //         }
        //     }
        // )
    });


app.route("/register")
    .get((req, res) => {
        res.render("register")
    })
    .post((req, res) => {

        User.register({username: req.body.username}, req.body.password, (err, user) => {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local") (req, res, () => {
                    res.redirect("/secrets")
                });
            }
        })
        // bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        //     const newUser = new User({
        //         email: req.body.username,
        //         password: hash,
        //     });
    
        //     newUser.save((err) => {
        //         if (!err) {
        //             res.render("secrets");
        //         } else {
        //             console.log(err);
        //         }
        //     });
        // });     
    });

app.listen(3000, () => {
    console.log("server started successfully.")
})
