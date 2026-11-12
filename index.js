require('dotenv').config(); 
const express = require('express');
const {Pool} = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});


//Get 200

app.get('/api/mascotas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mascotas ORDER BY id ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener las mascotas:', error);
        res.status(500).json({ error: 'Error al obtener las mascotas' });       
    }
    });

// GET por ID 


app.get('/api/mascotas/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mascotas WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mascota no encontrada' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener la mascota:', error);
        res.status(500).json({ error: 'Error al obtener la mascota' });
    }
});


// POST 201 o 400

app.post('/api/mascotas', async (req, res) => {
    const { chip, nombre, especie, raza, edad, peso, telefono_dueno, hospitalizado} = req.body;
    if (!chip || !nombre || !especie || !raza || !edad || !peso || !telefono_dueno ) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    if (peso <= 0) return res.status(400).json({ error: 'El peso debe ser un número positivo' });
    try {
        const query = 'INSERT INTO mascotas (chip, nombre, especie, raza, edad, peso, telefono_dueno, hospitalizado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
        const values = [chip, nombre, especie, raza, edad, peso, telefono_dueno, hospitalizado || false];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Código de error para violación de restricción de unicidad
            return res.status(400).json({ error: 'El chip ya existe en la base de datos' });
        }
        console.error('Error al crear la mascota:', error);
        res.status(500).json({ error: 'Error al crear la mascota' });
    }
});  



//PUT 200 

app.put('/api/mascotas/:id', async (req, res) => {
    const { chip, nombre, especie, raza, edad, peso, telefono_dueno, hospitalizado } = req.body;
    try {
        const query = 'UPDATE mascotas SET chip = $1, nombre = $2, especie = $3, raza = $4, edad = $5, peso = $6, telefono_dueno = $7, hospitalizado = $8 WHERE id = $9 RETURNING *';
        const values = [chip, nombre, especie, raza, edad, peso, telefono_dueno, hospitalizado || false, req.params.id];

        const result = await pool.query(query, values);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar la mascota:', error);
        res.status(500).json({ error: 'Error al actualizar la mascota' });
    }
});



//DELETE 200 o 404

app.delete('/api/mascotas/:id', async (req, res) => {
    try {
        const mascota = await pool.query('SELECT hospitalizado FROM mascotas WHERE id = $1', [req.params.id]);
        if (mascota.rows.length === 0) return res.status(404).json({ error: 'Mascota no encontrada' });
        
        // Validación: no eliminar si está hospitalizado
        if (mascota.rows[0].hospitalizado === true) {
            return res.status(400).json({ error: 'No se puede eliminar una mascota hospitalizada' });
        }

        await pool.query('DELETE FROM mascotas WHERE id = $1', [req.params.id]);
        res.status(204).send(); // 204 No Content
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));