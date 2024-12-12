import express from "express";
import bodyParser from "body-parser";
import { createConnection } from 'mysql2';
import { dirname } from "path";
import { fileURLToPath } from "url";
import multer from 'multer';
import path from 'path';
import { Console, error, log } from "console";
import session from "express-session";
import nodemailer from 'nodemailer';
import bcrypt from "bcrypt";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

const port = 3000;

const saltRounds = 10;



// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.render('enregitrer.ejs', { actionll : 'login' });
    }
};


app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false
}));

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'aymen.lamkhanet.07@gmail.com',
        pass: 'j f c l b s p l t b d u g x r b'
    }
});


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public/images')); // Destination directory
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Keep the original filename
    }
});

const upload = multer({ storage: storage });

// Handle POST request to upload an image
app.post('/upload', upload.single('image'), (req, res) => {
    if (req.file) {
        // File uploaded successfully
        const imageUrl = `/images/${req.file.originalname}`; // URL accessible from client

        res.status(200).json({ imageUrl: imageUrl });
        
    } else {
        res.status(400).json({ error: 'File upload failed' });
    }
});

// Routes:


app.get('/regles',(req,res)=>{
    res.render('reglement.ejs');
})

app.get("/about", (req, res) => {
    res.render("about.ejs");
});

app.get("/contact", (req, res) => {
    res.render("contact.ejs");
});

app.get("/", (req, res) => {
    connection.query('SELECT Location, Name FROM field', (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error");
        } else {
            // Convert the query results into an array of field objects
            const fields = results.map(row => ({
                address: row.Location,
                name: row.Name // Extract the name from the database
            }));
            console.log('Posi',fields);
            res.render("index.ejs", { fields });
        }
    });
});

app.post('/updateboss', (req, res) => {
    const id = req.body.id;
    const Name = req.body.fullName;
    const nickname = req.body.username;
    const Email = req.body.email;
    const address = req.body.address;
    const phone_number = req.body.phone_number;
    const country = req.body.country;
    const state = req.body.state;

    // Fetch existing data from the boss table
    connection.query('SELECT * FROM boss WHERE BossID = ?', [id], (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).send('Database error');
        }

        // Check if the record exists
        if (results.length === 0) {
            return res.status(404).send('Record not found');
        }

        // Use existing data if new data is not provided
        const existingField = results[0];
        const Nameup = Name || existingField.Name;
        const Emailup = Email || existingField.Email;
        const phone_numberup = phone_number || existingField.phone_number;
        const addressup = address || existingField.address;
        const countryup = country || existingField.country;
        const stateup = state || existingField.state;
        const nicknameup = nickname || existingField.nickname;

        // Log updated values for debugging
        console.log('Updating with values:', {
            Name: Nameup,
            Email: Emailup,
            phone_number: phone_numberup,
            address: addressup,
            country: countryup,
            state: stateup,
            nickname: nicknameup
        });

        // Update the record in the boss table
        connection.query(
            'UPDATE boss SET Name = ?, Email = ?, phone_number = ?, address = ?, country = ?, state = ?, nickname = ? WHERE BossID = ?',
            [Nameup, Emailup, phone_numberup, addressup, countryup, stateup, nicknameup, id],
            (err, result) => {
                if (err) {
                    console.error('An error occurred while executing the query:', err);
                    return res.status(500).send('Database error');
                }

                console.log('Update successfully!', result);
                res.redirect('/profile'); // Redirect to the profile page or wherever appropriate
            }
        );
    });
});

app.post('/ss', (req, res) => {
    const action = req.body.action;
    const [operation, id] = action.split('_');
    switch (operation) {
        case 'view':
            console.log(`View item with ID: ${id}`);
            connection.query('SELECT * FROM field WHERE FieldID = ?', [id], (err, result) => {
                if (err) {
                    console.error('An error occurred while executing the query:', err);
                    return res.status(500).send('Database error');
                }
                if (result.length === 0) {
                    return res.status(404).send('Field not found');
                }
                const nestedArray = result.map(row => Object.values(row));
                console.log('Nested array:', nestedArray);
                res.render('view.ejs', {   nestedArray, i: 0});
            });
            break;

        case 'edit':
        console.log(`Edit item with ID: ${id}`);
        // Retrieve the existing field data
        connection.query('SELECT * FROM field WHERE FieldID = ?', [id], (err, result) => {
            if (err) {
                console.error('An error occurred while executing the query:', err);
                return res.status(500).send('Database error');
            }
            if (result.length === 0) {
                return res.status(404).send('Field not found');
            }
            const fieldData = result[0];
            res.render('edit.ejs', { field: fieldData });
        });
        break;

        case 'delete':
        console.log(`Delete item with ID: ${id}`);

        // Check if the field exists in the field table
        connection.query('SELECT * FROM field WHERE FieldID = ?', [id], (err, fieldResult) => {
            if (err) {
                console.error('An error occurred while executing the query:', err);
                return res.status(500).send('Database error');
            }
            if (fieldResult.length === 0) {
                return res.status(404).send('Field not found');
            }

            // Check if the field has associated payments
            connection.query('SELECT * FROM payment WHERE ReservationID IN (SELECT ReservationID FROM reservation WHERE FieldID = ?)', [id], (err, paymentResult) => {
                if (err) {
                    console.error('An error occurred while executing the query:', err);
                    return res.status(500).send('Database error');
                }

                if (paymentResult.length > 0) {
                    // Collect reservation IDs to delete related payments first
                    connection.query('DELETE FROM payment WHERE ReservationID IN (SELECT ReservationID FROM reservation WHERE FieldID = ?)', [id], (err, deletePaymentResult) => {
                        if (err) {
                            console.error('Error deleting payments:', err);
                            return res.status(500).send('Error deleting payments');
                        }
                        console.log('Payments deleted');

                        // Now delete reservations
                        connection.query('DELETE FROM reservation WHERE FieldID = ?', [id], (err, deleteReservationResult) => {
                            if (err) {
                                console.error('Error deleting reservations:', err);
                                return res.status(500).send('Error deleting reservations');
                            }
                            console.log('Reservations deleted');

                            // Finally, delete the field from the field table
                            connection.query('DELETE FROM field WHERE FieldID = ?', [id], (err, deleteFieldResult) => {
                                if (err) {
                                    console.error('An error occurred while deleting the field:', err);
                                    return res.status(500).send('Error deleting field');
                                }
                                console.log('Field deleted');
                                const message = `Field and associated reservations have been successfully deleted.`;
                                res.render('delete-success.ejs', { message });
                            });
                        });
                    });
                } else {
                    // If no payments, directly check for reservations
                    connection.query('SELECT * FROM reservation WHERE FieldID = ?', [id], (err, reservationResult) => {
                        if (err) {
                            console.error('An error occurred while executing the query:', err);
                            return res.status(500).send('Database error');
                        }
                        if (reservationResult.length > 0) {
                            // If reservations exist, delete them
                            connection.query('DELETE FROM reservation WHERE FieldID = ?', [id], (err, deleteReservationResult) => {
                                if (err) {
                                    console.error('Error deleting reservations:', err);
                                    return res.status(500).send('Error deleting reservations');
                                }
                                console.log('Reservations deleted');
                            });
                        }

                        // Finally, delete the field from the field table
                        connection.query('DELETE FROM field WHERE FieldID = ?', [id], (err, deleteFieldResult) => {
                            if (err) {
                                console.error('An error occurred while deleting the field:', err);
                                return res.status(500).send('Error deleting field');
                            }
                            console.log('Field deleted');
                            const message = `Field has been successfully deleted from the field table.`;
                            res.render('delete-success.ejs', { message });
                        });
                    });
                }
            });
        });
        break;

        default:
            res.send('Unknown operation');
    }
});

app.post('/update-field', upload.single('image'), (req, res) => {
    const { FieldID, name, location, description, price, url } = req.body;
    const updatedImageUrl = req.file ? `/images/${req.file.filename}` : url;
    // Retrieve existing data
    connection.query('SELECT * FROM field WHERE FieldID = ?', [FieldID], (err, result) => {
        if (err) {
            console.error('An error occurred while executing the query:', err);
            return res.status(500).send('Database error');
        }
        if (result.length === 0) {
            return res.status(404).send('Field not found');
        }

        const existingField = result[0];

        // Use existing values if no new values are provided
        const updatedName = name || existingField.Name;
        const updatedLocation = location || existingField.Location;
        const updatedDescription = description || existingField.Description;
        const updatedPrice = price || existingField.PricePerHour;

        connection.query(
            'UPDATE field SET Name = ?, Location = ?, Description = ?, PricePerHour = ?, image_url = ? WHERE FieldID = ?',
            [updatedName, updatedLocation, updatedDescription, updatedPrice, updatedImageUrl, FieldID],
            (err, result) => {
                if (err) {
                    console.error('An error occurred while executing the query:', err);
                    return res.status(500).send('Database error');
                }
                res.redirect('/boss'); // Redirect to the list of fields or wherever appropriate
            }
        );
    });
});

app.get('/client',(Req,res)=>{
    connection.query('SELECT * FROM user;', (err, results) => {
        if (err) {
            console.error('An error occurred while executing the query:', err);
            return res.status(500).send('Database error');
        }
        const columnNames = Object.keys(results[0]);
        const nestedArray = results.map(row => Object.values(row));
        console.log('Nested array:', nestedArray);
        res.render('clients.ejs',{nestedArray,columnNames});
        });
});

app.get('/profile', isAuthenticated, (req, res) => {
    const userId = req.session.userId; // Get the logged-in user's ID

    connection.query('SELECT * FROM boss WHERE BossID = ?', [userId], (err, results) => {
        if (err) {
            console.error('An error occurred while executing the query:', err);
            return res.status(500).send('Database error');
        }

        if (results.length === 0) {
            // If no user is found with the given ID, handle it (e.g., redirect or show a message)
            return res.status(404).send('User not found');
        }

        const columnNames = Object.keys(results[0]);
        const nestedArray = results.map(row => Object.values(row));
        console.log('Nested array BOSS PROFILE:', nestedArray);
        console.log('Column names:', columnNames);

        res.render('profile.ejs', { nestedArray, columnNames });
    });
});

app.get('/payement',(req,res)=>{
    connection.query('SELECT * FROM payment;', (err, results) => {
        if (err) {
            console.error('An error occurred while executing the query:', err);
            return res.status(500).send('Database error');
        }
        const columnNames = Object.keys(results[0]);
        const nestedArray = results.map(row => Object.values(row));
        console.log('Nested array:', nestedArray);
        res.render('payement.ejs',{nestedArray,columnNames});
        })
});

app.get('/home',(req,res)=> {
    const userId = req.session.userId;

    if (!userId) {
        return res.redirect('/submit');
    }
    connection.query('SELECT Name FROM boss WHERE BossID = ? ',[userId],(error,results)=>{
        if(error){
            console.error('An error occurred while executing the query:', error);
            return res.status(500).send('Database error');
        }
        const nestedArray = results.map(row => Object.values(row));
        connection.query('SELECT COUNT(*) AS count FROM reservation', (err, result) => {
        if (err) {
            console.error('An error occurred while executing the query:', err);
            return res.status(500).send('Database error');
        }
        const count = result[0].count;
        connection.query('SELECT SUM(Amount) AS total_prix FROM payment',(err,result)=>{
            if(err){
                console.error('An error occurred while executing the query:', err);
                return res.status(500).send('Database error');
                }
                const total_prix = result[0].total_prix;
                connection.query('SELECT COUNT(*) AS count FROM field',(err,result)=>{
                    if(err){
                        console.error('An error occurred while executing the query:', err);
                        return res.status(500).send('Database error');
                    }
                    const countField = result[0].count;
                    connection.query('SELECT COUNT(*) AS count FROM user',(err,result)=>{
                        if(err){
                            console.error('An error occurred while executing the query:', err);
                            return res.status(500).send('Database error');
                        }
                        const countClient = result[0].count;
                        res.render('homeboss.ejs',{nestedArray,count,total_prix,countField,countClient});

                })
                })
                
                });
        });
        });
    
});

app.post('/search', (req, res) => {
    const role = req.body.role;
    const query = req.body.query;
    const month = req.body.month;
    const day = req.body.day;
    const currentYear = new Date().getFullYear();

    console.log(`Search query: ${query}, Month: ${month}, Day: ${day}`);

    connection.query('SELECT FieldID FROM field WHERE Name = ?', [query], (error, fieldResults) => {
        if (error) {
            console.error('An error occurred while executing the query:', error);
            return res.status(500).send('Database error');
        }

        if (fieldResults.length === 0) {
            return res.status(404).send('Field not found');
        }

        const fieldID = fieldResults[0].FieldID;
        const Datereservee = `${currentYear}-${month}-${day}`;

        connection.query(
            'SELECT StartTime FROM reservation WHERE FieldID = ? AND ReservationDate = ?',
            [fieldID, Datereservee],
            (error, results) => {
                if (error) {
                    console.error('An error occurred while executing the query:', error);
                    return res.status(500).send('Database error');
                }

                const nestedArray = results.map(row => Object.values(row));
                console.log('Already booked at:', nestedArray);
                console.log('Reservation Date:', Datereservee);

                if (nestedArray.length > 0) {
                    console.log('First booked time:', nestedArray[0][0]);
                } else {
                    console.log('No bookings found for the given date');
                }

                res.render('times.ejs', { nestedArray, Datereservee, query ,role});
            }
        );
    });
});

app.get('/calendar', (req, res) => {
    if (req.query.action) {
        console.log(req.query.action);
        const action = req.query.action;
        res.render('calender.ejs', { action: action });
    } else {
        res.render('calender.ejs');
    }
});

app.get('/reservation',(req,res)=>{
    connection.query('SELECT * FROM reservation;', (err, results) => {
        if (err) {
            console.error('An error occurred while executing the query:', err);
            return res.status(500).send('Database error');
            }
        const columnNames = Object.keys(results[0]);
        const nestedArray = results.map(row => Object.values(row));
        console.log('Nested array:', nestedArray);
        res.render('reservation.ejs',{nestedArray,columnNames});
        })
});

app.post('/submit', (req, res) => {
    const actionll = req.body.action;
    res.render('enregitrer.ejs', { actionll });

});

app.get('/submit', (req, res) => {
    const actionll = req.query.actionll;

    // Use the actionll parameter as needed
    console.log('actionll:', actionll);

    // Render the submit page or handle the parameter
    res.render('enregitrer.ejs', { actionll });
});

app.get('/info',(req,res)=>{
    res.render('info.ejs');
});

app.get('/frendlygame',(req,res)=>{
    res.render('frendlygame.ejs');
});

app.get('/frendlycup',(req,res)=>{
    res.render('frendlycup.ejs');
});

app.get('/child',(req,res)=>{
    res.render('childrentime.ejs');
});

app.get('/boss', (req, res) => {
    connection.query('SELECT * FROM field', (error, results) => {
        if (error) {
            console.error('An error occurred while executing the query:', error);
            return res.status(500).send('Database error');
        }
        const nestedArray = results.map(row => Object.values(row));
        console.log('Nested array:', nestedArray);
        connection.query('SELECT Name FROM boss',(error,results)=>{
            if(error){ 
                console.error('An error occurred while executing the query:', error);
                return res.status(500).send('Database error');
            }
            console.log(results);
            const nestedArray2 = results.map(row => Object.values(row));
            console.log('Nested array BOSS HH:', nestedArray2);
            res.render('boss.ejs', { nestedArray});
        })
    });
});

app.get('/newadmin',(req,res)=>{
    res.render('newadmin.ejs');
})

app.post('/newadmin', (req, res) => {
    const fullName = req.body.fullName;
    const email = req.body.email;
    const address = req.body.address;
    const phone = req.body.phone_number;
    const country = req.body.country;
    const state = req.body.state;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    // Check if password and confirmPassword match
    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match');
    }

    // Insert into database
    connection.query('INSERT INTO boss (Name, Email, Password, phone_number, address, country, state, nickname) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [fullName, email, password, phone, address, country, state, 'leader'], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }
        res.redirect('/submit?actionll=connect');
    });
});

app.get('/add',(req,res)=>{
    res.render('bossaddfield.ejs');
});

app.post('/ajouter', upload.single('image'), (req, res) => {
    const nomterrain = req.body.name;
    const posi = req.body.localisation;
    const descrip = req.body.descri;
    const prix = req.body.price;
    const urlimg = req.body.url; // Assuming urlimg is the URL of the uploaded image

    // Check if all required fields are present
    if (!nomterrain || !posi || !descrip || !prix || !urlimg) {
        return res.status(400).send('All fields are required');
    }

    connection.query(
        'INSERT INTO field (Name, Location, Description, PricePerHour, image_url) VALUES (?, ?, ?, ?, ?)',
        [nomterrain, posi, descrip, prix, urlimg],
        (error, results) => {
            if (error) {
                console.error('An error occurred while executing the query:', error);
                return res.status(500).send('Database error');
            }
            res.redirect('/boss'); // Redirect to a success page or wherever needed
        }
    );
});

app.post('/check',async(req,res)=>{
    const actionll = req.body.action;

    if(actionll === "login") {
    const emailenter = req.body.email;
    const passwordenter = req.body.password;
    console.log('what you enter :', emailenter);
    console.log('what you enter :', passwordenter);

    connection.query(
        'SELECT UserID, password FROM user WHERE Email = ?', 
        [emailenter], 
        async (err, results) => {
            if (err) {
                console.error('Error executing query:', err.stack);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            console.log('Query Results :', results);

            if (results.length > 0) {
                const user = results[0];
                const match = await bcrypt.compare(passwordenter, user.password);
                if (match) {
                    // Passwords match, proceed with login
                    req.session.userId = user.UserID; // Store user ID in session
                    console.log("Connection Successfully");
                    res.redirect('/reserv');
                } else {
                    // Passwords do not match
                    res.status(401).json({ error: " Passwords do not match" });
                }
            } else {
                console.log("Connection Failed");
                res.render('enregitrer.ejs', { actionll, error: 'Incorrect email or password' });
            }
        }

    )}else if (actionll==="sign-up"){
        const emailenter = req.body.email;
        const passwordenter = req.body.password;
        const passwordenter1 = req.body.password1;
        const nameenter = req.body.fullname;
        const phoneenter = req.body.phone;
        if (passwordenter === passwordenter1) {
            const verificationCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code
            req.session.verificationCode = verificationCode;
            req.session.userData = { nameenter, emailenter, passwordenter, phoneenter };

            const mailOptions = {
                from: 'aymen.lamkhanet.07@gmail.com',
                to: emailenter,
                subject: 'Email Verification Code',
                text: `Your verification code is: ${verificationCode}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
            res.redirect('/verify');
        } else {
            console.log("the pword not compatible");
            res.render('enregitrer.ejs', { actionll });
        }
        
    }else if(actionll==="connect"){
        const emailenter=req.body.email;
        const passwordenter=req.body.password;
        connection.query('SELECT BossID  FROM boss WHERE Password = ? AND email = ?' , [passwordenter,emailenter],(err,results) =>{
            if(err){
                console.error('Error executing query:', err.stack);
                return;
            }
            console.log('Query results:', results);
            if (results.length > 0) {
                console.log("Connection Successfully");
                req.session.userId = results[0].BossID;
                console.log(results[0].BossID);
                res.redirect('/home',);
            } else {
                console.log("Connection Failed");
                res.render('enregitrer.ejs', { actionll, error: 'Incorrect email or password' });
            }
            
        })    
    }
});

app.get('/verify', (req, res) => {
    res.render('verify.ejs');
});

app.post('/verify', (req, res) => {
    const code = req.body.code;

    if (code === req.session.verificationCode.toString()) {
        const { nameenter, emailenter, passwordenter, phoneenter } = req.session.userData;
        bcrypt.hash(passwordenter,saltRounds,async(err,hash)=>{
            if(err){
                console.error('Error hashing password:', err.stack);
                return;
            }
            connection.query('INSERT INTO user (Name, Email, Password, PhoneNumber) VALUES (?, ?, ?, ?)', [nameenter, emailenter, hash, phoneenter], (err, results) => {
                if (err) {
                    console.error('Error executing query:', err.stack);
                    return;
                }
                console.log("User registered successfully");
                req.session.userId = results.insertId;
                res.redirect('/reserv');
            });

            })
    } else {
        console.log('Invalid verification code');
        res.send('Invalid verification code. Please try again.');
    }
});

app.get('/reserv', (req, res) => {
    connection.query('SELECT image_url , Name , FieldID  FROM field', (err, result) => {
        if (err) {
            console.error('Error executing query:', err.stack);
            return;
        }
        const nestedArray = result.map(row => Object.values(row));
        console.log('nestedArray:', nestedArray);
        res.render('reserv.ejs', { nestedArray });
    });
}); 

app.get('/formulaire',isAuthenticated, (req, res) => {
    const field = req.query.Field;
    const date = req.query.date;
    const startTime = req.query.time;

    // Calculate end time (start time + 1 hour)
    const calculateEndTime = (startTime) => {
        const [hours, minutes, seconds] = startTime.split(':').map(Number);
        const start = new Date();
        start.setHours(hours, minutes, seconds);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return end.toTimeString().split(' ')[0];
    };

    const endTime = calculateEndTime(startTime);

    connection.query('SELECT * FROM field WHERE Name = ?', [field], (err, results) => {
        if (err) {
            console.error('Error executing query:', err.stack);
            res.status(500).send('Error retrieving field data');
            return;
        }
        if (results.length > 0) {
            const fieldData = results[0];
            const location = fieldData.Location;
            const fieldPrice = fieldData.PricePerHour;
            const fieldDescription = fieldData.Description;
            console.log("Field:", field, "Start Time:", startTime, "End Time:", endTime, "Date:", date ,"description",fieldDescription,"price",fieldPrice,"position",location);
            connection.query('SELECT Name ,Email ,PhoneNumber FROM user WHERE UserID = ?',[req.session.userId],(err,results)=>{
                if(err){
                    console.error('Error executing query:', err.stack);
                    res.status(500).send('Error retrieving user data');
                    return;
                }
                if(results.length>0){
                    const userData = results[0];
                    const nom = userData.Name;
                    const gmail = userData.Email;
                    const phone = userData.PhoneNumber;
                    console.log("User:", userData);
                    res.render('formulaire.ejs', { field, date, startTime, endTime, fieldDescription, fieldPrice, location , nom , gmail , phone });
                }
            })        
        } else {
            res.status(404).send('Field not found');
        }
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.post('/addreserv', (req, res) => {
    const { user, email, field, date, start, end, price, description, location } = req.body;

    console.log('Received data:', req.body);

    connection.query('SELECT FieldID FROM field WHERE Name = ?', [field], (err, result) => {
        if (err) {
            console.error('Error executing query:', err.stack);
            return res.status(500).send('Database error');
        }

        if (result.length === 0) {
            return res.status(400).send('Field not found');
        }

        const fieldId = result[0].FieldID;

        connection.query('SELECT UserID FROM user WHERE Name = ?', [user], (err, results) => {
            if (err) {
                console.error('Error executing query:', err.stack);
                return res.status(500).send('Database error');
            }

            if (results.length === 0) {
                return res.status(400).send('User not found');
            }

            const userId = results[0].UserID;
            const status = 'Réservé';

            connection.query('INSERT INTO reservation (UserID, FieldID, ReservationDate, StartTime, EndTime, Status) VALUES (?, ?, ?, ?, ?, ?)', 
                [userId, fieldId, date, start, end, status], (err) => {
                if (err) {
                    console.error('Error executing query:', err.stack);
                    return res.status(500).send('Database error');
                }

                console.log('Reservation added successfully!');
                res.render('addreserv-success.ejs', { 
                    message: 'Reservation added successfully!',
                    user,
                    email,
                    field,
                    description,
                    location,
                    price,
                    date,
                    start,
                    end
                });
            });
        });
    });
});

app.get('/pay', (req, res) => {
    const { user, field, date, start, end, fieldPrice } = req.query;
    console.log('Received data:', req.query);
    res.render('choosepay.ejs', { user, field, date, start, end, fieldPrice });
});

app.get('/introduce', (req, res) => {
    const name = req.query.name; // Get the name from the query parameter

    if (!name) {
        return res.status(400).json({ error: 'No name provided' });
    }

    connection.query('SELECT * FROM field WHERE name = ?', [name], (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        const nestedArray = results.map(row => Object.values(row));
        console.log('received data :',nestedArray);
        res.render('introduce.ejs', { nestedArray });
    });
});

app.get('/mode', async (req, res) => {
    const { user, field, date, start, end, fieldPrice } = req.query;
    console.log('OOOOOOOOOOOO',user, field, date, start, end, fieldPrice);
    connection.query('SELECT Name ,RibBank FROM owner WHERE FieldID = (SELECT FieldID FROM field WHERE Name = ?)',[field],(err,result )=>{
        if(err){
            console.error('Error fetching data:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        const nestedArray = result.map(row => Object.values(row));
        console.log('received data :',nestedArray);
        connection.query('SELECT * FROM user WHERE Name = ?',[user],(err,result)=>{
            if(err){
                console.error('Error fetching data:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            const nestedArray2 = result.map(row => Object.values(row));
            res.render('modepay.ejs', { user, field, date, start, end, fieldPrice ,nestedArray,nestedArray2});
        })
        
    })
});

app.get('/mode1',(req,res)=>{
    const { user, field, date, start, end, fieldPrice } = req.query;
    console.log('OOOOOOOOOOOO',user, field, date, start, end, fieldPrice);
    connection.query('SELECT Name ,RibBank FROM owner WHERE FieldID = (SELECT FieldID FROM field WHERE Name = ?)',[field],(err,result )=>{
        if(err){
            console.error('Error fetching data:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        const nestedArray = result.map(row => Object.values(row));
        console.log('received data :',nestedArray);
        res.render('modepay1.ejs', { user, field, date, start, end, fieldPrice ,nestedArray});
    })
});

app.post('/addpay', (req, res) => {
    const { date, start, fieldPrice } = req.body;
    console.log('Received Data:', date, start, fieldPrice);

    // Check if date and start are undefined or null
    if (!date || !start) {
        return res.status(400).json({ error: 'Date and Start Time are required' });
    }

    connection.query(
        'SELECT ReservationID, UserID FROM reservation WHERE ReservationDate = ? AND StartTime = ?',
        [date, start],
        (error, result) => {
            if (error) {
                console.log('Database error:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: 'No reservation found for the given date and start time' });
            }

            console.log('Query Result:', result);

            const reservationID = result[0].ReservationID;
            const UserID = result[0].UserID;

            connection.query(
                'INSERT INTO payment (UserID, ReservationID, Amount, PaymentDate , Status) VALUES (?, ?, ?, ? , ?)',
                [UserID, reservationID, fieldPrice, date , 'Paye'],
                (err, result) => {
                    if (err) {
                        console.log('Insert error:', err);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    res.json({ message: 'Payment added successfully' });
                }
            );
        }
    );
});

app.post('/addpay1', (req, res) => {
    const { date, start, fieldPrice } = req.body;
    console.log('Received Data:', date, start, fieldPrice);

    // Check if date and start are undefined or null
    if (!date || !start) {
        return res.status(400).json({ error: 'Date and Start Time are required' });
    }

    connection.query(
        'SELECT ReservationID, UserID FROM reservation WHERE ReservationDate = ? AND StartTime = ?',
        [date, start],
        (error, result) => {
            if (error) {
                console.log('Database error:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: 'No reservation found for the given date and start time' });
            }

            console.log('Query Result:', result);

            const reservationID = result[0].ReservationID;
            const UserID = result[0].UserID;

            connection.query(
                'INSERT INTO payment (UserID, ReservationID, Amount, PaymentDate , Status) VALUES (?, ?, ?, ? , ?)',
                [UserID, reservationID, fieldPrice, date , 'Paye'],
                (err, result) => {
                    if (err) {
                        console.log('Insert error:', err);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    res.json({ message: 'Payment added successfully' });
                }
            );
        }
    );
});

