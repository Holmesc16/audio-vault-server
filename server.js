const express = require('express')
require('dotenv').config()
const helmet = require('helmet') // creates headers that protect from attacks (security)
const bodyParser = require('body-parser') // turns response into usable format
const cors = require('cors')  // allows/disallows cross-site communication
const morgan = require('morgan') // logs requests
const { Pool, Client } = require('pg')
const audio = require('./controllers/audio')
const users = require('./controllers/users')
const app = express()

// heroku 
let heroku = process.env.HEROKU_DATABASE_URL

  const client = new Client({
    connectionString: heroku
  })
  client.connect()

// App Middleware
const whitelist = ['http://localhost:5432', 'http://localhost:5000', 'http://localhost:3001', 'http://localhost:3000']
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}
app.use(helmet())
app.use(cors(corsOptions))
app.use(bodyParser.json())
app.use(morgan('combined')) // use 'tiny' or 'combined'
let allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Headers', "*");
    next();
  }
  app.use(allowCrossDomain);

// Audio
app.get('/', (req, res) => audio.getAudioData(req, res, client))
app.get('/audio', (req, res) => audio.getAudioData(req, res, client))
app.get('/file/:id', (req, res)=> audio.getAudioDataById(req, res, client))
app.get('/search', (req, res) => audio.searchAudioData(req, res, client))
app.post('/audio/upload', (req, res) => audio.postAudioData(req, res, client))
app.put('/audio/update/:id', (req, res) => audio.putAudioData(req, res, client))
app.delete('/audio/delete/:id', (req, res) => audio.deleteAudioData(req, res, client))
app.get('/tags/:tag', (req, res) => audio.getAudioByTagName(req, res, client))
app.post('/audio/similar', (req, res) => audio.getSimiliarAudioByDateProximity(req, res, client))
app.get('/tags', (req, res) => audio.getRandomOrderOfTags(req, res, client))
app.post('/clip', (req, res) => audio.postNewAudioClip(req, res, client))
// Favorites
app.get('/favorites/:user', (req, res) => audio.getUserFavorites(req, res, client))
app.post('/favorites/update', (req, res) => audio.putAudioFavorites(req, res, client))
app.post('/favorites/put', (req, res) => audio.putUserFavorites(req, res, client))
// Users
app.post('/signup', (req, res) => users.signup(req, res, client))
app.post('/signin', (req, res)=> users.signin(req, res, client))


// App Server Connection
app.listen(process.env.PORT || 5000, () => {
  console.log(`app is running on port ${process.env.PORT || 5000}`)
})