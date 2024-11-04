//% weight=100 color=#DC22E1 block="MINTspark Nezha V2" blockId="MINTspark Nezha V2" icon="\uf0e7"
namespace mintspark {
    /*
     * NeZha V2
     */

    export enum ServoMotionMode {
        //%block="shortest path"
        ShortPath = 1,
        //%block="clockwise"
        CW = 2,
        //%block="counterclockwise"
        CCW = 3
    }

    let maxSpeed = 50;
    let minSpeed = 10;
    let MPU6050Initialised = false;
    let stopDrive = true;
    let i2cAddr: number = 0x10;

    function restrictSpeed(speed: number):number{
        if (speed > 100) { speed = 100 };
        if (speed < -100) { speed = -100 };

        if (speed < 0)
        { 
            if (speed > -minSpeed) { return -minSpeed; }
            return Math.map(speed, -minSpeed, -100, -minSpeed, -maxSpeed);
        }

        if (speed > 0) 
        {
            if (speed < minSpeed) { return minSpeed; }
            return Math.map(speed, minSpeed, 100, minSpeed, maxSpeed);
        }

        return 0;
    }

    function getMotorDelay(speed: number, value: number, motorFunction: NezhaV2SportsMode) : number {
        speed *= 9;

        if (value == 0 || speed == 0) {
            return 0;
        }

        if (motorFunction == NezhaV2SportsMode.Circle) {
            return value * 360000.0 / speed + 500;
        } 
        else if (motorFunction == NezhaV2SportsMode.Second) {
            return (value * 1000);
        } 
        else if (motorFunction == NezhaV2SportsMode.Degree) {
            return value * 1000.0 / speed + 500;
        }

        return 0;
    }

    //% weight=100
    //% block="Set motor %motor speed to %speed\\%"
    //% subcategory="Motor / Servo"
    //% group="Motor"
    //% speed.min=-100 speed.max=100
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    //% color=#E63022
    export function setMotorSpeed(motor: NezhaV2MotorPostion, speed: number): void {
        speed = restrictSpeed(speed);
        nezhaV2.nezha2MotorSpeedCtrolExport(motor, speed);
    }
    
    //% weight=100
    //% block="Run motor %motor speed %speed for %value %mode || wait %wait"
    //% subcategory="Motor / Servo"
    //% group="Motor"
    //% speed.min=-100 speed.max=100
    //% wait.defl = true
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    //% color=#E63022
    export function runMotorFor(motor: NezhaV2MotorPostion, speed: number, value: number, mode: NezhaV2SportsMode, wait?: boolean): void {
        nezhaV2.setServoSpeed(Math.abs(speed));

        let direction: NezhaV2MovementDirection = NezhaV2MovementDirection.CW;

        if (speed < 0)
        {
            direction = NezhaV2MovementDirection.CCW;
        }

        let buf = pins.createBuffer(8);
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = direction;
        buf[4] = 0x70;
        buf[5] = (value >> 8) & 0XFF;
        buf[6] = mode;
        buf[7] = (value >> 0) & 0XFF;
        pins.i2cWriteBuffer(i2cAddr, buf);

        if (wait == true)
        {
            basic.pause(getMotorDelay(speed, value, mode));
        }

        //nezhaV2.motorSpeed(motor, direction, value, mode);
    }

    //% weight=95
    //% subcategory="Motor / Servo"
    //% group="Motor"
    //% block="Stop motor %motor"
    //% color=#E63022
    export function stopMotor(motor: NezhaV2MotorPostion): void {
        stopDrive = true;
        nezhaV2.nezha2MotorSpeedCtrolExport(motor, 0);
    }

    //% weight=90
    //% subcategory="Motor / Servo"
    //% group="Motor"
    //% block="Stop all motor"
    //% color=#E63022
    export function stopAllMotor(): void {
        stopDrive = true;
        nezhaV2.nezha2MotorSpeedCtrolExport(NezhaV2MotorPostion.M1, 0);
        nezhaV2.nezha2MotorSpeedCtrolExport(NezhaV2MotorPostion.M2, 0);
        nezhaV2.nezha2MotorSpeedCtrolExport(NezhaV2MotorPostion.M3, 0);
        nezhaV2.nezha2MotorSpeedCtrolExport(NezhaV2MotorPostion.M4, 0);
    }

    export function setServoSpeed(motor: NezhaV2MotorPostion, speed: number): void {
        speed *= 15
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = 0x00;
        buf[3] = 0x00;
        buf[4] = 0x77;
        buf[5] = (speed >> 8) & 0XFF;
        buf[6] = 0x00;
        buf[7] = (speed >> 0) & 0XFF;
        pins.i2cWriteBuffer(i2cAddr, buf);
    }

    //% weight=80
    //% subcategory="Motor / Servo"
    //% group="Servo"
    //% block="Set motor %motor to absolute angle %angle° direction %turnmode"
    //% color=#a3a3c2
    //% targetAngle.min=0  targetAngle.max=359
    export function goToAbsolutePosition(motor: NezhaV2MotorPostion, targetAngle: number, turnMode:ServoMotionMode): void {
        while (targetAngle < 0) {
            targetAngle += 360
        }
        targetAngle %= 360

        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x5D;
        buf[5] = (targetAngle >> 8) & 0XFF;
        buf[6] = turnMode;
        buf[7] = (targetAngle >> 0) & 0XFF;
        pins.i2cWriteBuffer(i2cAddr, buf);
        
        basic.pause(100);
        let maxTime = getMotorDelay(100, 1, NezhaV2SportsMode.Circle);
        let startTime = input.runningTime();

        while (readServoAbsoluteSpeed(motor) > 0 && (input.runningTime() - startTime) < maxTime)
        {
            basic.pause(100);
        }
    }

    //% weight=50
    //% subcategory="Motor / Servo"
    //% group="Servo"
    //%block="%NezhaV2MotorPostion absolute angular position"
    //% color=#a3a3c2
    export function readServoAbsolutePostion(motor: NezhaV2MotorPostion): number {
        return nezhaV2.readServoAbsolutePostion(motor);
    }

    //% weight=49
    //% subcategory="Motor / Servo"
    //% group="Motor"
    //%block="%NezhaV2MotorPostion speed (revolutions/sec)"
    //% color=#E63022
    export function readServoAbsoluteSpeed(motor: NezhaV2MotorPostion): number {
        return nezhaV2.readServoAbsoluteSpeed(motor);
    }

    /*
     * Tank Mode
     */
    let tankMotorLeft: NezhaV2MotorPostion = NezhaV2MotorPostion.M4;
    let tankMotorLeftReversed: boolean = true;
    let tankMotorRight: NezhaV2MotorPostion = NezhaV2MotorPostion.M1;
    let tankMotorRightReversed: boolean = false;

    export enum TurnDirection {
        //% block="left"
        Left,
        //% block="right"
        Right
    }

    //% weight=45
    //% block="Set robot motor right to %motor reverse %reverse"
    //% subcategory="Tank Mode"
    //% group="Setup"
    //% motor.defl=neZha.MotorList.M1
    //% reverse.defl=false
    //% reverse.shadow="toggleYesNo"
    //% color=#E63022
    export function setTankMotorRight(motor: NezhaV2MotorPostion, reverse: boolean): void {
        tankMotorRight = motor;
        tankMotorRightReversed = reverse;
    }

    //% weight=50
    //% block="Set robot motor left to %motor reverse %reverse"
    //% subcategory="Tank Mode"
    //% group="Setup"
    //% motor.defl=neZha.MotorList.M4
    //% reverse.defl=true
    //% reverse.shadow="toggleYesNo"
    //% color=#E63022
    export function setTankMotorLeft(motor: NezhaV2MotorPostion, reverse: boolean): void {
        tankMotorLeft = motor;
        tankMotorLeftReversed = reverse;
    }

    /*
     * PlanetX Sensors
     */

    //% weight=110
    //% subcategory="Sensor / Input"
    //% group="Sensor"
    //% block="Soil moisture sensor %Rjpin value(0~100)"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% color=#ffcc66
    export function soilHumidity(Rjpin: PlanetX_Basic.AnalogRJPin): number {
        return PlanetX_Basic.soilHumidity(Rjpin);
    }

    //% weight=105
    //% subcategory="Sensor / Input"
    //% group="Input"
    //% block="Trimpot %Rjpin analog value"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% color=#ffcc66
    export function trimpot(Rjpin: PlanetX_Display.AnalogRJPin): number {
        return PlanetX_Basic.trimpot(Rjpin);
    }

    //% weight=100
    //% subcategory="Sensor / Input"
    //% group="Input"
    //% block="Crash Sensor %Rjpin is pressed"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% color=#EA5532 
    export function Crash(Rjpin: PlanetX_Display.DigitalRJPin): boolean {
        return PlanetX_Basic.Crash(Rjpin);
    }

    const crashSensorEventId = 54119;
    //% weight=95
    //% subcategory="Sensor / Input"
    //% group="Input"
    //% block="Crash Sensor %Rjpin pressed"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% color=#EA5532 
    export function onCrashSensorPressed(Rjpin: PlanetX_Display.DigitalRJPin, handler: () => void) {
        control.onEvent(crashSensorEventId, 0, handler);
        control.inBackground(() => {
            let lastState = PlanetX_Basic.Crash(Rjpin);
            while (true) {
                let isPressed = PlanetX_Basic.Crash(Rjpin);

                if (isPressed && !lastState) {

                    control.raiseEvent(crashSensorEventId, 0);
                }
                lastState = isPressed;
                basic.pause(200);
            }
        })
    }

    let lastUltrasoundSensorReading = 50;

    //% weight=80
    //% block="Ultrasonic sensor %Rjpin distance %distance_unit"
    //% subcategory="Sensor / Input"
    //% group="Sensor"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% distance_unit.fieldEditor="gridpicker"
    //% distance_unit.fieldOptions.columns=2
    //% color=#EA5532
    export function ultrasoundSensor(Rjpin: PlanetX_Basic.DigitalRJPin, distance_unit: PlanetX_Basic.Distance_Unit_List): number {
        let distance = PlanetX_Basic.ultrasoundSensor(Rjpin, distance_unit);

        if (distance <= 0)
        {
            distance = lastUltrasoundSensorReading;
        }

        lastUltrasoundSensorReading = distance;
        return lastUltrasoundSensorReading;
    }

    const ultrasonicSensorEventId = 54121;
    //% weight=78
    //% subcategory="Sensor / Input"
    //% group="Sensor"
    //% block="Ultrasonic Sensor %Rjpin triggered"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    export function onUltrasonicSensorTriggered(Rjpin: PlanetX_Display.DigitalRJPin, handler: () => void) {
        control.onEvent(ultrasonicSensorEventId, 0, handler);
        control.inBackground(() => {
            let lastState = false;
            while (true) {
                let distance = PlanetX_Basic.ultrasoundSensor(Rjpin, PlanetX_Basic.Distance_Unit_List.Distance_Unit_cm);
                let detected = distance > 0 && distance < 6;

                if (detected && !lastState) {
                    control.raiseEvent(ultrasonicSensorEventId, 0);
                }

                lastState = detected;
                basic.pause(200);
            }
        })
    }
    
    //% weight=75
    //% subcategory="Sensor / Input"
    //% group="Sensor"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% color=#EA5532
    //% block="Line-tracking sensor %Rjpin is %state"
    export function trackingSensor(Rjpin: PlanetX_Basic.DigitalRJPin, state: PlanetX_Basic.TrackingStateType): boolean {
        return PlanetX_Basic.trackingSensor(Rjpin, state);
    }

    //% weight=55
    //% subcategory="Sensor / Input"
    //% group="Sensor"
    //% block="Color sensor IIC port detects %color"
    //% color=#00B1ED
    //% color.fieldEditor="gridpicker" color.fieldOptions.columns=3
    export function checkColor(color: PlanetX_Basic.ColorList): boolean {
        return PlanetX_Basic.checkColor(color);
    }

    //% weight=50
    //% subcategory="Sensor / Input"
    //% group="Sensor"
    //% block="Color sensor IIC port color HUE(0~360)"
    //% color=#00B1ED
    //%export function readColor(): number {
    //%    return PlanetX_Basic.readColor();
    //%}

    const colorSensorEventId = 54120;
    //% weight=45
    //% subcategory="Sensor / Input"
    //% group="Sensor"
    //% block="Color sensor detects %color"
    //% color=#00B1ED
    //% color.fieldEditor="gridpicker" color.fieldOptions.columns=3
    export function onColorSensorDetectsColor(color: PlanetX_Basic.ColorList, handler: () => void) {
        control.onEvent(colorSensorEventId, 0, handler);
        control.inBackground(() => {
            let lastIsMatch = PlanetX_Basic.checkColor(color);
            while (true) {
                let isMatch = PlanetX_Basic.checkColor(color);

                if (isMatch && !lastIsMatch) {
                    control.raiseEvent(colorSensorEventId, 0);
                }
                lastIsMatch = isMatch;
                basic.pause(200);
            }
        })
    }

    /*
     * PlanetX Output
     */

    //% subcategory="Light / Display"
    //% group="Light"
    //% block="LED %Rjpin toggle to $ledstate || brightness %brightness \\%"
    //% Rjpin.fieldEditor="gridpicker" Rjpin.fieldOptions.columns=2
    //% brightness.min=0 brightness.max=100
    //% ledstate.shadow="toggleOnOff"
    //% color=#EA5532 
    //% expandableArgumentMode="toggle"
    export function ledBrightness(Rjpin: PlanetX_Display.DigitalRJPin, ledstate: boolean, brightness: number = 100): void {
        PlanetX_Display.ledBrightness(Rjpin, ledstate, brightness);
    }

    //% subcategory="Light / Display"
    //% group="Display"
    //% line.min=1 line.max=8 line.defl=1
    //% text.defl="Hello!"
    //% block="Display: Show text %text on line %line"
    //% color=#00B1ED
    export function oledShowText(text: string, line: number) {
        PlanetX_Display.showUserText(line, text);
    }

    //% subcategory="Light / Display"
    //% group="Display"
    //% line.min=1 line.max=8 line.defl=1 
    //% n.defl=1234
    //% block="Display: Show number %n on line %line"
    //% color=#00B1ED
    export function oledShowNumber(n: number, line: number) {
        PlanetX_Display.showUserNumber(line, n);
    }

    //% subcategory="Light / Display"
    //% group="Display"
    //% block="clear display" color=#00B1ED
    export function oledClear() {
        PlanetX_Display.oledClear();
    }




    function setupMPU6050(): boolean {
        // Setup IMU
        if (!MPU6050Initialised) {
            MPU6050Initialised = MINTsparkMpu6050.InitMPU6050(0);
            return MPU6050Initialised;
        }

        return true;
    }
}