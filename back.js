const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./db/horarios.sqlite');

db.serialize(() => {
  db.run(`
  CREATE TABLE IF NOT EXISTS personas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identificacion TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    activo INTEGER DEFAULT 1
  )
`);

  db.run(`
  CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    hora_entrada TEXT NOT NULL,
    hora_salida TEXT,
    minutos_trabajados INTEGER,
    FOREIGN KEY (persona_id) REFERENCES personas(id),
    UNIQUE(persona_id, fecha)
  )
`);
});

function obtenerFechaLocal() {
  const ahora = new Date();
  return ahora.toISOString().slice(0, 10);
}

function unirFechaYHora(fecha, hora) {
  return `${fecha}T${hora}:00`;
}

function calcularMinutos(inicio, fin) {
  const diffMs = new Date(fin) - new Date(inicio);
  return Math.floor(diffMs / 60000);
}

app.get('/api/personas', (req, res) => {
  db.all('SELECT * FROM personas WHERE activo = 1 ORDER BY apellido, nombre', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al listar personas' });
    res.json(rows);
  });
});

app.get('/api/personas/todas', (req, res) => {
  db.all(
    'SELECT * FROM personas ORDER BY apellido, nombre',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Error al listar todas las personas' });
      }
      res.json(rows);
    }
  );
});

app.post('/api/personas', (req, res) => {
  const { nombre, apellido, identificacion } = req.body;

  const nombreLimpio = nombre?.trim();
  const apellidoLimpio = apellido?.trim();
  const identificacionLimpia = identificacion?.trim();

  if (!nombreLimpio || !apellidoLimpio || !identificacionLimpia) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  db.get(
    'SELECT id FROM personas WHERE identificacion = ?',
    [identificacionLimpia],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error al validar la identificación' });
      }

      if (row) {
        return res.status(400).json({ error: 'Ya existe una persona con esa identificación' });
      }

      db.run(
        'INSERT INTO personas (nombre, apellido, identificacion) VALUES (?, ?, ?)',
        [nombreLimpio, apellidoLimpio, identificacionLimpia],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Error al crear persona' });
          }

          res.json({
            id: this.lastID,
            mensaje: 'Persona creada correctamente'
          });
        }
      );
    }
  );
});

app.put('/api/personas/desactivar/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    'UPDATE personas SET activo = 0 WHERE id = ?',
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Error al desactivar persona' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Persona no encontrada' });
      }

      res.json({ mensaje: 'Persona desactivada' });
    }
  );
});

app.put('/api/personas/activar/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    'UPDATE personas SET activo = 1 WHERE id = ?',
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Error al activar persona' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Persona no encontrada' });
      }

      res.json({ mensaje: 'Persona activada' });
    }
  );
});


app.post('/api/registros', (req, res) => {
  const { persona_id, fecha, hora_entrada, hora_salida } = req.body;

  if (!persona_id || !fecha || !hora_entrada || !hora_salida) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const entradaCompleta = unirFechaYHora(fecha, hora_entrada);
  const salidaCompleta = unirFechaYHora(fecha, hora_salida);

  const entradaDate = new Date(entradaCompleta);
  const salidaDate = new Date(salidaCompleta);

  if (isNaN(entradaDate.getTime()) || isNaN(salidaDate.getTime())) {
    return res.status(400).json({ error: 'Fecha u hora inválida' });
  }

  if (entradaDate >= salidaDate) {
    return res.status(400).json({
      error: 'La hora de entrada no puede ser posterior ni igual a la hora de salida'
    });
  }

  db.get(
    'SELECT id FROM registros WHERE persona_id = ? AND fecha = ?',
    [persona_id, fecha],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error al validar registros existentes' });
      }

      if (row) {
        return res.status(400).json({
          error: 'Ya existe un registro para esa persona en esa fecha'
        });
      }

      const minutos = calcularMinutos(entradaCompleta, salidaCompleta);

      db.run(
        `INSERT INTO registros (persona_id, fecha, hora_entrada, hora_salida, minutos_trabajados)
         VALUES (?, ?, ?, ?, ?)`,
        [persona_id, fecha, entradaCompleta, salidaCompleta, minutos],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Error al guardar registro' });
          }

          res.json({
            mensaje: 'Registro guardado correctamente',
            minutos_trabajados: minutos
          });
        }
      );
    }
  );
});

app.get('/api/registros', (req, res) => {
  const { persona_id, fecha, identificacion } = req.query;

  let sql = `
    SELECT r.*, p.nombre, p.apellido, p.identificacion
    FROM registros r
    JOIN personas p ON p.id = r.persona_id
    WHERE 1 = 1
  `;
  const params = [];

  if (persona_id) {
    sql += ' AND r.persona_id = ?';
    params.push(persona_id);
  }

  if (fecha) {
    sql += ' AND r.fecha = ?';
    params.push(fecha);
  }

  if (identificacion) {
    sql += ' AND p.identificacion LIKE ?';
    params.push(`%${identificacion}%`);
  }

  sql += ' ORDER BY r.hora_entrada DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al listar registros' });
    }
    res.json(rows);
  });
});

app.delete('/api/registros/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM registros WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Error al eliminar el registro' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json({ mensaje: 'Registro eliminado correctamente' });
  });
});

app.get('/api/estadisticas/mensual', (req, res) => {
  const { persona_id, anio } = req.query;

  if (!persona_id) {
    return res.status(400).json({ error: 'Falta persona_id' });
  }

  let sql = `
    SELECT
      substr(fecha, 1, 7) AS periodo,
      SUM(minutos_trabajados) AS total_minutos,
      COUNT(*) AS cantidad_registros
    FROM registros
    WHERE persona_id = ?
  `;

  const params = [persona_id];

  if (anio) {
    sql += ` AND substr(fecha, 1, 4) = ?`;
    params.push(anio);
  }

  sql += `
    GROUP BY substr(fecha, 1, 7)
    ORDER BY periodo DESC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al calcular estadísticas mensuales' });
    }

    res.json(rows);
  });
});

app.get('/api/estadisticas/semanal', (req, res) => {
  const { persona_id, anio } = req.query;

  if (!persona_id) {
    return res.status(400).json({ error: 'Falta persona_id' });
  }

  let sql = `
    SELECT
      strftime('%Y-%W', fecha) AS periodo,
      SUM(minutos_trabajados) AS total_minutos,
      COUNT(*) AS cantidad_registros
    FROM registros
    WHERE persona_id = ?
  `;

  const params = [persona_id];

  if (anio) {
    sql += ` AND substr(fecha, 1, 4) = ?`;
    params.push(anio);
  }

  sql += `
    GROUP BY strftime('%Y-%W', fecha)
    ORDER BY periodo DESC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al calcular estadísticas semanales' });
    }

    res.json(rows);
  });
});



app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});