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