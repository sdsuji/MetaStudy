const express = require('express');
const router = express.Router();
const Classroom = require('../models/Classroom');
const auth = require('../middleware/auth');
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

router.post('/create', auth, async (req, res) => {
  try {
    const { name, subject, section } = req.body;
    const createdBy = req.user.id;

    const classroom = new Classroom({
  name,
  subject,
  section,
  createdBy,
  code: generateCode(), 
  folders: [
    { name: 'Materials', visibility: 'public' },
    { name: 'Test Submissions', visibility: 'private' },
    { name: 'Assignment Materials', visibility: 'private' },
    { name: 'Presentation Materials', visibility: 'private' },
    { name: 'Discussion Forum', visibility: 'public' },
    { name: 'Groups', visibility: 'private' }
  ]
});

    await classroom.save();
    res.status(201).json({ msg: 'Classroom created successfully', classroom });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let classrooms;

    if (userRole === 'teacher') {
      // Show classrooms created by this teacher
      classrooms = await Classroom.find({ createdBy: userId });
    } else {
      // Show classrooms this student has joined
      classrooms = await Classroom.find({ students: userId });
    }

    res.status(200).json({ classrooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error fetching classrooms' });
  }
});
router.post('/join', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { code } = req.body;

    if (role !== 'student') {
      return res.status(403).json({ msg: 'Only students can join a class' });
    }

    const classroom = await Classroom.findOne({ code });
    if (!classroom) {
      return res.status(404).json({ msg: 'Classroom not found with this code' });
    }

    // Check if already joined
    if (classroom.students.includes(userId)) {
      return res.status(400).json({ msg: 'Already joined this class' });
    }

    // Add student
    classroom.students.push(userId);
    await classroom.save();

    res.status(200).json({ msg: 'Successfully joined the class', classroom });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to join classroom' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) return res.status(404).json({ msg: 'Classroom not found' });
    res.status(200).json({ classroom });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to load classroom' });
  }
});


module.exports = router;
