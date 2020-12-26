const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
require('dotenv').config();

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: Date,
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Get all users
app.get('/api/exercise/users', (req, res) => {
  User.find()
    .select('username')
    .then((data) => {
      return res.json(data);
    })
    .catch((err) => res.json({ error: 'Server Error' }));
});

// Create a new user
app.post('/api/exercise/new-user', (req, res) => {
  if (!req.body.username) {
    return res.json({ error: 'Invalid username' });
  }

  User.findOne({ username: req.body.username })
    .then((user) => {
      if (user) {
        return res.json({ error: 'user already exists' });
      }

      const newUser = new User({
        username: req.body.username,
      });

      newUser
        .save()
        .then((user) => res.json(user))
        .catch((err) => res.json({ error: 'Server Error' }));
    })
    .catch((err) => res.json({ error: 'Server Error' }));
});

// Add an exercise
app.post('/api/exercise/add', async (req, res) => {
  const { userId, description, duration, date } = req.body;
  const _date = date ? new Date(date) : new Date();

  if (!userId || !description || !duration) {
    return res.json({ error: 'Missing data' });
  }

  User.findById(userId)
    .then((user) => {
      if (!user) {
        return res.json({ error: 'User not found' });
      }

      const exercise = new Exercise({
        userId,
        description,
        duration: Number(duration),
        date: _date,
      });

      exercise
        .save()
        .then((response) => {
          const payload = {
            username: user.username,
            description: response.description,
            duration: response.duration,
            _id: user._id,
            date: response.date.toDateString(),
          };

          return res.json(payload);
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => {
      return res.json({ error: 'server error' });
    });
});

// log a user's exercises
app.get('/api/exercise/log', async (req, res) => {
  if (!req.query.userId) {
    return res.json({ error: 'Please provide a user id' });
  }

  const fromDate = req.query.from
    ? new Date(req.query.from)
    : new Date('1900-1-1');
  const toDate = req.query.to ? new Date(req.query.to) : new Date();
  const limit = req.query.limit ? Number(req.query.limit) : null;

  try {
    const user = await User.findById(req.query.userId).select('username');
    const log = await Exercise.find({
      userId: req.query.userId,
      date: { $gte: fromDate, $lt: toDate },
    })
      .select('-_id description duration date')
      .limit(limit);

    const payload = {
      username: user.username,
      count: log.length,
      log,
    };

    return res.json(payload);
  } catch (error) {
    return res.json({ error: 'Server Error' });
  }
});

mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() =>
    app.listen(process.env.PORT || 3000, function () {
      console.log('Your app is listening on port ' + this.address().port);
    })
  );
