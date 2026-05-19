const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.send('<a href="/auth/google">auth google</a>');
});

router.get('/home', (req, res) => {
  res.send('hello from home Product controller');
});

module.exports = router;
