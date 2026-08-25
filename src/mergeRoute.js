const router = require('express').Router();

router.get('/api/analyse', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;