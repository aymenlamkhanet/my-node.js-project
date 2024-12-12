import { createConnection } from 'mysql2';

// Create a connection to the database
const connection = createConnection({
    host: 'localhost',
    user: 'root',
    password: 'W7301@jqir#',
    database: 'footballreservation'
});


// Export the database connection
export default connection;
