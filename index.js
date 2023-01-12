require("dotenv").config();
const bcrypt = require("bcryptjs");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const app = express();
const { Configuration, OpenAIApi } = require("openai");
const User = require("./models/user");

app.use(cors());
app.use(express.json());
app.use(express.static("build"));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }))

passport.use(
  new LocalStrategy((username, password, done) => {
    User.findOne({ username: username }, (err, user) => {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "No username" });
      }
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          return done(null, user);
        } else {
          return done(null, false, { message: "Incorrect password" });
        }
      })
    });
  })
)

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.use(passport.initialize());
app.use(passport.session());

app.post("/sign-up", (req, res) => {
  User.findOne({ username: req.body.username }, (err, existingUser) => {

    if (err) {
      return res.status(500).json({ error: err });
      ;

    }
    if (existingUser) {
      return res.status(400).send({ message: "Username already taken" });
    }
  })

  bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
    if (err) {
      res.status(500).json({ error: err });
    } else {
      const user = new User({
        username: req.body.username,
        password: hashedPassword,
        dailyUse: 0,
        lastLogin: Date.now(),

      }).save(err => {
        if (err) {
          return res.status(500).json({ error: err });
        }
        return res.status(200).json({ message: "sign up successful", username: req.body.username });
      });
    }
   })
});


app.post("/log-in", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(400).json({ error: "Incorrect username and password" });
    }
    if (!user) {
      return res.status(400).json({ error: "Incorrect username and password" });
    }
    req.logIn(user, err => {
      if (err) {
        return res.status(500).json({ error: err});
      }
      return res.status(200).json({ message: "Log in successful", id: user.id });
    });
  })(req, res, next);
});

app.get("/log-out", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return res.status(500).json({ error: "Something went wrong, please try to log out again" })
    }
    res.status(200).json({ message: "Log out successful" });
  });
});

app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: "You are not authenticated" });
  }
});

app.get("/api/image", (req, res) => {
  const user = req.user;

  if (user==="undefined") {
    return res.status(405).json({
      error: "user not authenticated"
    });
  }

  const configuration = new Configuration({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    });
  const openai = new OpenAIApi(configuration);

  async function generateImage(imageDescription, imageSize) {
    const response = await openai.createImage({
        prompt: imageDescription,
        n: 1,
        size: imageSize,
      });

    const image_url = response.data.data[0].url;
    return image_url;
  }

  const imageDescription = req.query.imageDescription;
  const imageSize = req.query.imageSize;

  generateImage(imageDescription, imageSize)
  .then(imageURL => {
    return res.status(200).json({url: imageURL});
  })
  .catch(error => {
    if (error.response.status === 400) {
      return res.status(400).json({ error: "If your request includes inappropriate content, it will not be generated" })
    } else {
      return res.status(500).json({ error: 'something went wrong' });
    }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
