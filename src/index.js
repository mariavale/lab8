// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

app.get('/', (req, res) => {
    res.send("Application is working!")
})

// TODO - Include your API routes here

app.get('/login', (req, res) => {
    // TODO - render the login page
    res.render('pages/login')
})

app.get('/register', (req, res) => {
    // TODO - render the registration page
    res.render('pages/register')
})

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});


app.post('/register', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

    console.log("Successfully got this data from the frontend (user):")
    console.log(username, password)

    const insertQuery = `INSERT INTO users VALUES ($1, $2) RETURNING *;`;
    const hash = await bcrypt.hash(password, 10);


    db.one(insertQuery, [username, hash])
        .then(data => {
            console.log("Added new user successfully!", data)
            res.redirect('/login')
        })
        .catch(err => {
            console.log(err)
        })
})


app.post('/login', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    const searchQuery = `SELECT * FROM users WHERE username = $1;`;

    db.one(searchQuery, [username])
        .then(async user => {
            const match = await bcrypt.compare(password, user.password);
            
            if(match){
                req.session.user = user;
                req.session.save();
                res.redirect('/discover')
            }
            else{
                res.render('/login', {message: "Wrong username or password!"})
            }
        })
        .catch(err => {
            console.log(err)
            console.log("user not found in database!")
            res.redirect('/login')
        })

        // TODO - ADD CONDITIONS TO LET THE USER KNOW WHAT IS WRONG
        // SHOW ERROR TO USER WHEN THEY ARE UNABLE TO LOGIN
})

// Authentication middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};


// ANYTHING ABOVE FOR ANYONE ON THE INTERNET
// ------------------

app.use(auth);

// ANYTHING BELOW ONLY FOR AUTHORIZED USERS

app.get('/discover', (req, res) => {
    res.render('pages/discover')
})

app.get('/logout', (req, res) => {
    res.render('pages/logout')
})

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');