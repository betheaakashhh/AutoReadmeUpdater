const router = require('express').Router();

router.get('/api/textdata', (req, res) => {
  res.json({ ok: true });
  console.log("GET:/api/textdata");
});

module.exports = router;