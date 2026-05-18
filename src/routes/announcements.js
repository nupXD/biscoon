const express = require('express');
const Announcement = require('../models/Announcement');

const router = express.Router();

router.get('/active', async (req, res) => {
  const now = new Date();
  const ann = await Announcement.findOne({
    active: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).sort({ createdAt: -1 });

  res.json({
    announcement: ann
      ? { id: ann.id, title: ann.title, body: ann.body, type: ann.type }
      : null,
  });
});

module.exports = router;
