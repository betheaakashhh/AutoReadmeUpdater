const router = require('express').Router();

router.get('/api/merging', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;