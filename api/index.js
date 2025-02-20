//require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.static(path.join(__dirname, '../public')));

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Define a schema for the registration data
const registrationSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true, minlength: 8 },
    email: { type: String, required: true, unique: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, required: true, enum: ['male', 'female', 'other'] },
    biography: { type: String, maxlength: 500 },
    profilePicture: { type: String, required: true },
});

const Registration = mongoose.model('Registration', registrationSchema);

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage: storage });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Route to handle registration form submission
app.post('/register', upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('Profile picture is required.');
        }

        const formData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: req.body.password,
            confirmPassword: req.body.confirmPassword,
            email: req.body.Email,
            dateOfBirth: req.body.DateOfBirth,
            gender: req.body.Gender,
            biography: req.body.Biography,
        };

        console.log('Form Data:', formData);

        const requiredFields = ['firstName', 'lastName', 'password', 'confirmPassword', 'email', 'dateOfBirth', 'gender'];
        const missingFields = requiredFields.filter(field => !formData[field]);

        if (missingFields.length > 0) {
            return res.status(400).send(`Missing required fields: ${missingFields.join(', ')}`);
        }

        if (formData.password !== formData.confirmPassword) {
            return res.status(400).send('Passwords do not match.');
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            return res.status(400).send('Password must be at least 8 characters long and contain at least one letter and one number.');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            return res.status(400).send('Invalid email format.');
        }

        const dateOfBirth = new Date(formData.dateOfBirth);
        if (isNaN(dateOfBirth.getTime())) {
            return res.status(400).send('Invalid date of birth.');
        }

        const hashedPassword = await bcrypt.hash(formData.password, 10);

        const registrationData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            password: hashedPassword,
            email: formData.email,
            dateOfBirth: dateOfBirth,
            gender: formData.gender,
            biography: formData.biography,
            profilePicture: req.file.path,
        };

        const newRegistration = new Registration(registrationData);
        await newRegistration.save();

        res.status(200).send('Registration successful!');
    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).send('Registration failed. Please try again.');
    }
});

// Route to fetch all registrations
app.get('/api/registrations', async (req, res) => {
    try {
        const registrations = await Registration.find({});
        res.status(200).json(registrations);
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).send('Error fetching registrations.');
    }
});

// Route to serve registration form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

// Route to view registrations
app.get('/view-registrations', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/view-registration.html'));
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000'); 
});

module.exports = app;
