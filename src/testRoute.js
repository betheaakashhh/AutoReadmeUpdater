const router = require('express').Router();

router.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;