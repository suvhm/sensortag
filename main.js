#!/usr/bin/env node

/* Checking if correct number of arguments are passes */
if ((process.argv.length  < 4 ) || (process.argv.length > 5))
{
   console.log("Usage : " + __filename + " [UUID] [NoOfObs] [DelayInObs(5s)]");
   process.exit(-1);
}

var filename = process.env.SNAP_COMMON + '/data.txt'
var exceptionFilename = process.env.SNAP_COMMON + '/exception.txt'
var sensor_data = process.env.SNAP_COMMON + '/sensor_data.txt'

//Spawning a child process for checking TI-Sensortag device UUID*/
 const spawnSync = require('child_process').spawnSync;
 const ls = spawnSync('sensortag', ['--all', '-n 1','-f ',filename, process.argv[2]]);

 var out = ls.stderr.toString();
 if (out.includes('Failed to connect')) {
     console.log("Error!! Invalid SensorTag UUID");
     process.exit(-1);
 }

var delayInObs=process.argv[6]
if (delayInObs == undefined) {
  delayInObs = 5;
}

      //Spawning a child process for obtaining observations from the TI-Sensortag device
      const spawn = require('child_process').spawn;
      const lsNew = spawn('sensortagUpdate', [process.argv[3], delayInObs, process.argv[2], filename , exceptionFilename]);

//Creating a file event notifier to read observations from a file and post it to the Starfish Studio platform
var fs = require('fs');
var Inotify = require('inotify').Inotify;
var inotify = new Inotify();
var dataUpdateCount = 1;
var watcher = {
 path: process.env.SNAP_COMMON + '/',
 watch_for: Inotify.IN_CLOSE_WRITE,
 callback: function (event) {
 var file = event.name ? event.name : '';
 var mask = event.mask;

 if ((file == 'data.txt') && (file.indexOf('.') !== 0) ) {
   if (mask & Inotify.IN_CLOSE_WRITE) {
      var timestamp = new Date().toISOString();
      console.log("\nNotify Event TimeStamp " + timestamp + "\n");
      var file = fs.readFileSync(filename, "utf8" );
      var observation = file;
      console.log("Sensor_observation : " + observation);
      fs.appendFileSync('/var/snap/sensortag-app/common/sensor_data', dataUpdateCount + ": No of Times \n" + observation + "\nAt Time: " + timestamp + "\n" );
      console.log("Writing Data successfully " + dataUpdateCount + " times");
      dataUpdateCount += 1;     
      var closing_session = file;
      if (closing_session == "Closing Session") {
          console.log("Data writing finished : " + timestamp );
          inotify.close();
          }

 }
    else {
    console.log("Corrupted Sensor Data : " + sensor_data);
    console.log("Corrupted Sensor Data Length : " + sensor_data.length);
    }  
 }
   else if ((file == 'exception.txt') && (mask & Inotify.IN_CLOSE_WRITE)) {
      var exceptionfile = fs.readFileSync(exceptionFilename, "utf8" );
      if ((true == (exceptionfile.includes('Failed to connect'))|| (true == exceptionfile.includes('Device disconnected')))) {
          console.log("Either Sensor-Tag is powered off or Bluetooth connectivity is Down");
          inotify.close();
      }
   }
 }
};
inotify.addWatch(watcher);

