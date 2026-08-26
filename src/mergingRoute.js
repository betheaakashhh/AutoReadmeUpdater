const router = require('express').Router();

router.get('/api/merging', (req, res) => {
  res.json({ ok: true });
  console.log("GET:/api/merging");
});

module.exports = router;