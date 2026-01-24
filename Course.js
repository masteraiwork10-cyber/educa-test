const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    instructor: { type: String, required: true },
    price: { type: Number, default: 0 },
    thumbnail: { type: String, default: 'https://via.placeholder.com/150' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', CourseSchema);