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



function uploadFirmware()
{
    const fileInput = document.getElementById('fileInput');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressContainer = document.getElementById('uploadProgressContainer');
    const statusText = document.getElementById('uploadStatus');

    if (fileInput.files.length === 0) {
        alert(".bin file is not choosen!");
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.innerText = "Uploading...";


    xhr.uplod.addEventListener("progress" , (e) => {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            progressBar.style.width = percent + "%";
            statusText.innerText = `Uploading: %${Math.round(percent)}`;
        }
    })


    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                statusText.innerText = "Uploaded to ESP , going to STM...";
                statusText.style.color = "#00ff00";
            } else {
                statusText.innerText = "Error: File not uploaded!";
                statusText.style.color = "#ff0000";
            }
        }
    };

    //  (ESP32'nin IP'si ve endpointi)
    xhr.open("POST", "/upload_firmware", true);
    xhr.send(formData);
}


