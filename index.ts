import express = require("express");
import httpLib = require('http');
import * as rob from 'robotjs';
import * as fs from 'fs';
import { Server } from "socket.io";
import Settings from "./Settings";
import C2SEvent from "./events/C2SEvent";

const app = express();
const http = new httpLib.Server(app);
const io = new Server(http);
const port = process.env.PORT || 3000;

let loginList: Array<number> = [];
let sessions: Array<number> = [];

let events = new Map();

app.use('/', express.static('../app'))

fs.readdirSync('events').forEach(file => {
  if(file.includes('.map') || file.includes('C2SEvent')) return;
  file = "events/" + file;
  let query: C2SEvent = require('./' + file);
  events.set(query.event, { event: query.event, callback: query.callback });
})

io.on('connection', (socket) => {
  console.log('Connected to client @ ' + new Date())

  setTimeout(function () { socket.emit('server_connected'); console.log("Sent user connection success message") }, 150);
  socket.on('keypress', keys => {
    if (keys.includes('{')) {
      keys.split('{').forEach((key: string) => {
        if (key == '') return;
        key = key.split('}')[0];
        rob.keyToggle(key, "down")
        setTimeout(function () { rob.keyToggle(key, "up") }, 150)
      })
    } else {
      rob.keyTap(keys)
    }
  });
  events.forEach(event => {
    socket.on(event.event, (args: any) => {
      let callback = event.callback(socket, args, loginList);
      if (callback.startsWith('ValidateSession:')) {
        let person: number = callback.split(":")[1];
        sessions.push(person);
      }
    })
  })
  socket.on('Authenticated', (sessionID) => {
    console.log("Recieved " + sessionID, ", checking..")
    if (sessions.includes(sessionID)) {
      console.log(sessionID, "is valid!")
      socket.emit('greenlight')
    } else {
      console.log(sessionID, "is invalid, kicking out user..")
      socket.emit('banish')
    }
  })
});


http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});

export default loginList;