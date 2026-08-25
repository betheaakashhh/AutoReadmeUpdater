const router = require('express').Router();

router.get('/api/mergese', (req, res) => {
  res.json({ ok: true });
});
router.get("/api/testing/merger", (req, res) =>{
    res.json({ ok: true });
})

module.exports = router;