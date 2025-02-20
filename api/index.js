const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();

// Hardcoded MongoDB connection string
const MONGODB_URI = 'mongodb+srv://abrish12:afgt123@host.xi4iz.mongodb.net/your-database-name?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
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

// Middleware for parsing request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Route to handle registration form submission
app.post('/register', upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Profile picture is required.' });
        }

        const formData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: req.body.password,
            confirmPassword: req.body.confirmPassword,
            email: req.body.email,
            dateOfBirth: req.body.dateOfBirth,
            gender: req.body.gender,
            biography: req.body.biography,
        };

        console.log('Form Data:', formData);

        // Validate required fields
        const requiredFields = ['firstName', 'lastName', 'password', 'confirmPassword', 'email', 'dateOfBirth', 'gender'];
        const missingFields = requiredFields.filter(field => !formData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
        }

        // Validate password match
        if (formData.password !== formData.confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long and contain at least one letter and one number.' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            return res.status(400).json({ error: 'Invalid email format.' });
        }

        // Validate date of birth
        const dateOfBirth = new Date(formData.dateOfBirth);
        if (isNaN(dateOfBirth.getTime())) {
            return res.status(400).json({ error: 'Invalid date of birth.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(formData.password, 10);
        console.log('Password hashed successfully.');

        // Prepare registration data
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

        console.log('Registration data:', registrationData);

        // Save registration data to MongoDB
        const newRegistration = new Registration(registrationData);
        await newRegistration.save();
        console.log('Registration saved to MongoDB.');

        // Send success response
        res.status(200).json({ message: 'Registration successful!' });
    } catch (error) {
        console.error('Registration failed:', error);

        // Handle duplicate email error
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists.' });
        }

        // Handle other errors
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Route to fetch all registrations
app.get('/api/registrations', async (req, res) => {
    try {
        const registrations = await Registration.find({});
        res.status(200).json(registrations);
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ error: 'Error fetching registrations.' });
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;