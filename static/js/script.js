const socket = io();
const CHART_WINDOW = 50;

const variables = [
    { key: 'Depth', color: '#00d4ff' }, { key: 'Ax', color: '#ff4b2b' },
    { key: 'Ay', color: '#2af598' }, { key: 'Az', color: '#00d4ff' },
    { key: 'pitch', color: '#ff4b2b' }, { key: 'roll', color: '#2af598' },
    { key: 'yaw', color: '#ffd700' }, { key: 'velocity', color: '#bdc3c7' },
    { key: 'distance', color: '#2af598' }
];

const charts = {};

document.addEventListener('DOMContentLoaded', () => {
    variables.forEach(v => {
        const ctx = document.getElementById('chart_' + v.key).getContext('2d');
        charts[v.key] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(CHART_WINDOW).fill(""),
                datasets: [{ data: Array(CHART_WINDOW).fill(null), borderColor: v.color, borderWidth: 2, pointRadius: 0, fill: false }]
            },
            options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { grid: { color: '#222' } } }, plugins: { legend: { display: false } } }
        });
    });
});

socket.on('update_chart', (data) => {
    if(data.armed !== undefined) updateStatusBox(data.armed);
    variables.forEach(v => {
        const chart = charts[v.key];
        if (chart && data[v.key] !== undefined) {
            chart.data.datasets[0].data.push(data[v.key]);
            chart.data.datasets[0].data.shift();
            chart.update('none');
        }
    });
});

function sendCommand(cmd) { socket.emit('ui_command', { action: cmd }); }

function sendPID() {
   const getFloat = (id) => {
        const val = document.getElementById(id).value;
        return parseFloat(val) || 0; // Boşsa veya geçersizse 0 döner
    };

    const payload = {
        action: "PID_SETPOINT_UPDATE",
        // PITCH Grubu
        kppitch: getFloat('kp_pitch'),
        kipitch: getFloat('ki_pitch'),
        kdpitch: getFloat('kd_pitch'),
        setpitch: getFloat('sp_pitch'),
        // YAW Grubu
        kpyaw: getFloat('kp_yaw'),
        kiyaw: getFloat('ki_yaw'),
        kdyaw: getFloat('kd_yaw'),
        setyaw: getFloat('sp_yaw')
    };

    console.log("[JS] Giden Paket:", payload);
    socket.emit('ui_command', payload);
}

function updateStatusBox(armed) {
    const box = document.getElementById('status-box');
    box.innerText = armed ? "ARMED" : "DISARMED";
    box.className = armed ? "status-danger" : "status-safe";
}



function confirmReset() {
    if (confirm("Are you sure?")) {
        console.log("[JS] Reset sending...");
        socket.emit('ui_command', { action: 'RESET' });
    }
}


function crc32(buf) {
  let table = window.crc32Table;
  if (!table) {
    table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    window.crc32Table = table;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).toUpperCase();
}


/**
 * Helper function to calculate CRC32 of a buffer
 * Standard Polynomial: 0xEDB88320
 */
function calculateCRC32(buffer) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buffer.length; i++) {
        crc ^= buffer[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Main Firmware Upload Function
 */
function uploadFirmware() {
    const fileInput = document.getElementById('fileInput');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressContainer = document.getElementById('uploadProgressContainer');
    const statusText = document.getElementById('uploadStatus');

    if (fileInput.files.length === 0) {
        alert("Error: No .bin file selected!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    // 1. Show UI elements and reset progress
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.style.color = "#c5c6c7"; // Default color
    statusText.innerText = "Reading file for CRC calculation...";

    // 2. Read the file to calculate CRC before sending
    reader.onload = function(e) {
        const buffer = new Uint8Array(e.target.result);
        const fileCrc = calculateCRC32(buffer);
        const crcHex = fileCrc.toString(16).toUpperCase();

        console.log(`[GCS] File: ${file.name} | CRC32: 0x${crcHex}`);

        // 3. Prepare XHR and FormData
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", file);

        // Upload progress listener
        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progressBar.style.width = percent + "%";
                statusText.innerText = `Uploading to ESP: %${Math.round(percent)}`;
            }
        });

        // Response handler
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    statusText.innerText = "SUCCESS: Uploaded to ESP. Transferring to STM32...";
                    statusText.style.color = "#00ff00";
                    console.log("[GCS] ESP response: " + xhr.responseText);
                } else {
                    statusText.innerText = `ERROR: Upload failed! (Status: ${xhr.status})`;
                    statusText.style.color = "#ff0000";
                    console.error("[GCS] Upload failed.");
                }
            }
        };

        // 4. Send request with CRC in custom header
        const ESP_IP = "10.172.218.100"; 
        const targetUrl = `http://${ESP_IP}/upload_firmware`; 
        console.log("[GCS] Hedef URL:", targetUrl);
        xhr.open("POST", targetUrl, true); // Sadece bu satır kalsın
        xhr.setRequestHeader("X-File-CRC", crcHex);
        xhr.send(formData);
    };

    reader.onerror = function() {
        statusText.innerText = "Error: Could not read file!";
        statusText.style.color = "#ff0000";
    };

    reader.readAsArrayBuffer(file);
}
