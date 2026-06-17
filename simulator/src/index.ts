import * as net from "net";
import { server } from "jsmodbus";
import * as mqtt from "mqtt";

// --- CONFIGURACIÓN ---
const MODBUS_PORT = 5020;
const MQTT_BROKER_URL = "mqtt://mosquitto:1883"; // Usamos el nombre del servicio de docker

// --- 1. SIMULADOR MODBUS TCP SERVER ---
const netServer = new net.Server();
const modbusServer = new server.TCP(netServer);

// Registros holding registers (40001 en adelante)
// 0: Temperatura (Multiplicada por 10 para simular punto decimal, ej: 25.4°C -> 254)
// 1: Presión (en PSI, ej: 90 PSI)
const holdingRegisters = new Uint16Array(2);

netServer.listen(MODBUS_PORT, () => {
  console.log(`[Modbus] Servidor corriendo en el puerto ${MODBUS_PORT}`);
});

// --- 2. CLIENTE MQTT (Simulación directa) ---
const mqttClient = mqtt.connect(MQTT_BROKER_URL);

mqttClient.on("connect", () => {
  console.log("[MQTT] Conectado al broker exitosamente.");
});

// --- 3. BUCLE DE SIMULACIÓN DE DATOS ---
setInterval(() => {
  // Simular variaciones de Temperatura (rango 20.0°C - 35.0°C)
  const temp = parseFloat(
    (25 + Math.sin(Date.now() / 5000) * 5 + Math.random()).toFixed(1),
  );
  // Simular variaciones de Presión (rango 80 - 100 PSI)
  const press = Math.floor(
    90 + Math.cos(Date.now() / 3000) * 8 + Math.random() * 2,
  );

  // Actualizar Modbus (Guardamos enteros)
  holdingRegisters[0] = Math.round(temp * 10);
  holdingRegisters[1] = press;

  // Actualizar el buffer de holding registers (2 bytes por registro, big-endian)
  modbusServer.holding.writeUInt16BE(holdingRegisters[0], 0);
  modbusServer.holding.writeUInt16BE(holdingRegisters[1], 2);

  // Publicar por MQTT en formato JSON (Simulando telemetría directa)
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    temperature: temp,
    pressure: press,
  });

  mqttClient.publish("factory/line1/telemetry", payload);

  console.log(
    `[Simulador] Datos actualizados -> Temp: ${temp}°C, Press: ${press} PSI`,
  );
}, 2000);
