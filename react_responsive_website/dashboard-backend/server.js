const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const { execFile } = require('child_process');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Path to the ML prediction script
const PREDICT_SCRIPT = path.join(
  __dirname, '..', '..', 'ml_model_training', 'predict.py'
);

// ── POST /api/predict ─────────────────────────────────────────────────────────
// Body: { taxi_type, zone_id, hour, dow, month }
// Returns: prediction JSON from the model
app.post('/api/predict', (req, res) => {
  const { taxi_type, zone_id, hour, dow, month } = req.body;

  // Basic input validation
  if (!taxi_type || zone_id == null || hour == null || dow == null || month == null) {
    return res.status(400).json({ error: 'Missing required fields: taxi_type, zone_id, hour, dow, month' });
  }

  const args = [
    PREDICT_SCRIPT,
    String(taxi_type),
    String(zone_id),
    String(hour),
    String(dow),
    String(month),
  ];

  execFile('python3', args, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) {
      console.error('Python error:', stderr);
      return res.status(500).json({ error: 'Prediction script failed.', detail: stderr });
    }

    try {
      const result = JSON.parse(stdout.trim());
      if (result.error) {
        return res.status(500).json(result);
      }
      return res.json(result);
    } catch (parseErr) {
      return res.status(500).json({ error: 'Could not parse model output.', raw: stdout });
    }
  });
});

// ── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ TaxiPulse Backend running → http://localhost:${PORT}`);
  console.log(`   Prediction endpoint: POST /api/predict`);
});
