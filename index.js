const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist',
  };


  async function retrieveListItems() {
    try {
      // Create a connection to the database
      const connection = await mysql.createConnection(dbConfig);
      
      // Query to select all items from the database
      const query = 'SELECT id, text FROM items';
      
      // Execute the query
      const [rows] = await connection.execute(query);
      
      // Close the connection
      await connection.end();
      
      // Return the retrieved items as a JSON array
      return rows;
    } catch (error) {
      console.error('Error retrieving list items:', error);
      throw error; // Re-throw the error
    }
  }

// Stub function for generating HTML rows
async function getHtmlRows() {
    // Example data - replace with actual DB data later
    /*
    const todoItems = [
        { id: 1, text: 'First todo item' },
        { id: 2, text: 'Second todo item' }
    ];*/

    const todoItems = await retrieveListItems();

    // Generate HTML for each item
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button class="delete-btn">×</button></td>
        </tr>
    `).join('');
}

// Modified request handler with template replacement
async function handleRequest(req, res) {
    if (req.url === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );
            
            // Replace template placeholder with actual content
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
    } else if (req.method === 'POST' && req.url === '/add') {
    let body = '';
    req.on('data', chunk => {
        body += chunk;
    });
    req.on('end', async () => {
        try {
            const { text } = JSON.parse(body);
            if (!text) throw new Error("Текст не передан");
            const newItemId = await addItem(text);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, id: newItemId }));
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
    });
    }
     else if (req.method === 'POST' && req.url === '/delete') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });
        req.on('end', async () => {
            try {
                const { id } = JSON.parse(body);
                if (!id) throw new Error("ID не передан");
                await deleteItem(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/edit') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });
        req.on('end', async () => {
            try {
                const { id, text } = JSON.parse(body);
                if (!id || !text) throw new Error("ID или текст не переданы");
                await updateItem(id, text);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}


async function addItem(text) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const query = 'INSERT INTO items (text) VALUES (?)';
    const [result] = await connection.execute(query, [text]);
    await connection.end();
    return result.insertId;
  } catch (error) {
    console.error('Error adding item:', error);
    throw error;
  }
}

async function deleteItem(id) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'DELETE FROM items WHERE id = ?';
        const [result] = await connection.execute(query, [id]);
        await connection.end();
        return result;
    } catch (error) {
        console.error('Error deleting item:', error);
        throw error;
    }
}

async function updateItem(id, newText) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'UPDATE items SET text = ? WHERE id = ?';
        const [result] = await connection.execute(query, [newText, id]);
        await connection.end();
        return result;
    } catch (error) {
        console.error('Error updating item:', error);
        throw error;
    }
}

// async function getHtmlRows() {
//    const todoItems = await retrieveListItems();
//    return todoItems.map(item => `
//        <tr>
//            <td>${item.id}</td>
//            <td>${item.text}</td>
//            <td>
//                <button class="edit-btn">Edit</button>
//                <button class="delete-btn">×</button>
//            </td>
//        </tr>
//    `).join('');
//}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.text}</td>
            <td>
                <button class="edit-btn" data-id="${item.id}">Edit</button>
                <button class="delete-btn" data-id="${item.id}">×</button>
            </td>
        </tr>
    `).join('');
}

async function retrieveListItems() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'SELECT id, text FROM items ORDER BY id';
        const [rows] = await connection.execute(query);
        await connection.end();
        return rows;
    } catch (error) {
        console.error('Error retrieving list items:', error);
        throw error;
    }
}



// Create and start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
