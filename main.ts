//% weight=100 color=#DC22E1 block="MINTspark Nezha V2" blockId="MINTspark Nezha V2" icon="\uf0e7"
namespace mintspark {
    /*
     * NeZha V2
     */

    export enum DistanceUnint {
        //%block="cm"
        cm = 1,
        //%block="inch"
        inch = 2
    }

    export enum MotorConnector {
        //%block="M1"
        M1 = 1,
        //%block="M2"
        M2 = 2,
        //%block="M3"
        M3 = 3,
        //%block="M4"
        M4 = 4
    }

    export enum MotorMovementMode {
        //%block="turns"
        Turns = 1,
        //%block="degrees"
        Degrees = 2,
        //%block="seconds"
        Seconds = 3
    }

    export enum MotorRotationDirection {
        //%block="clockwise"
        CW = 1,
        //%block="counterclockwise"
        CCW = 2
    }

    export enum ServoMovementMode {
        //%block="shortest path"
        ShortPath = 1,
        //%block="clockwise"
        CW = 2,
        //%block="counterclockwise"
        CCW = 3
    }

    export enum LinearDirection {
        //%block="forward"
        Forward = 1,
        //%block="backward"
        Backward = 2
    }

    let i2cAddr: number = 0x10;

    // Restrict Motor speed if required
    // Sometimes 100% is too much for younger learners
    // Sometimes a value too low can make the motor stall 
    // Set the min and max values here:
    let maxSpeed = 100;
    let minSpeed = 5;

    // Enforce the min and max speeds set above
    // The entered speed will be mapped to the available range
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

    /*
    * Motor / Servo Functions
    */

    // Calculate how much time is needed to complete a motor function and return it in ms
    // This can be used to block the thread for the required amount of time to let the motor function complete
    function getMotorDelay(speed: number, value: number, motorFunction: MotorMovementMode): number {
        if (value == 0 || speed == 0) {
            return 0;
        }

        speed *= 9;

        if (motorFunction == MotorMovementMode.Turns) {
            return value * 360000.0 / speed + 500;
        }
        else if (motorFunction == MotorMovementMode.Seconds) {
            return (value * 1000);
        }
        else if (motorFunction == MotorMovementMode.Degrees) {
            return value * 1000.0 / speed + 500;
        }

        return 0;
    }

    //% weight=110
    //% block="Run motor %motor at speed %speed\\%"
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //% speed.min=-100 speed.max=100
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    //% color=#E63022
    export function runMotor(motor: MotorConnector, speed: number): void {
        speed = restrictSpeed(speed);

        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        if (speed > 0) {
            buf[3] = MotorRotationDirection.CW;
        }
        else {
            buf[3] = MotorRotationDirection.CCW;
        }
        buf[4] = 0x60;
        buf[5] = Math.abs(speed);
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
    }
    
    //% weight=100
    //% block="Run motor %motor at speed %speed for %value %mode || wait %wait"
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //% speed.min=-100 speed.max=100
    //% wait.defl = true
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    //% color=#E63022
    export function runMotorFor(motor: MotorConnector, speed: number, value: number, mode: MotorMovementMode, wait?: boolean): void {
        setServoSpeed(motor, Math.abs(speed));

        let direction: MotorRotationDirection = MotorRotationDirection.CW;

        if (speed < 0)
        {
            direction = MotorRotationDirection.CCW;
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
    }

    //% weight=95
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //% block="Stop motor %motor"
    //% color=#E63022
    export function stopMotor(motor: MotorConnector): void {
        runMotor(motor, 0);
    }

    //% weight=90
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //% block="Stop all motors"
    //% color=#E63022
    export function stopAllMotor(): void {
        runMotor(MotorConnector.M1, 0);
        runMotor(MotorConnector.M2, 0);
        runMotor(MotorConnector.M3, 0);
        runMotor(MotorConnector.M4, 0);
    }

    export function setServoSpeed(motor: MotorConnector, speed: number): void {
        speed *= 9
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x77;
        buf[5] = (speed >> 8) & 0XFF;
        buf[6] = 0x00;
        buf[7] = (speed >> 0) & 0XFF;
        pins.i2cWriteBuffer(i2cAddr, buf);
    }

    //% weight=49
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //%block="%motor speed (rpm)"
    //% color=#E63022
    export function readServoAbsoluteSpeed(motor: MotorConnector): number {
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x47;
        buf[5] = 0x00;
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        basic.pause(3);
        let ServoSpeed1Arr = pins.i2cReadBuffer(i2cAddr, 2);
        let Servo1Speed = (ServoSpeed1Arr[1] << 8) | (ServoSpeed1Arr[0]);
        return Math.floor(Servo1Speed * 0.0926 * 2);
    }

    // A function to block the thread until a motor movement is completed or the max time has elapsed
    function waitForMotorMovementComplete(motor: MotorConnector, maxTime: number): void {
        basic.pause(100);
        let startTime = input.runningTime();
        while (readServoAbsoluteSpeed(motor) > 0 && (input.runningTime() - startTime) < maxTime) {
            basic.pause(100);
        }
    }

    //% weight=80
    //% subcategory="Motor / Servo"
    //% group="Servo Functions"
    //% block="Turn motor %motor to absolute angle %angle° move %turnmode"
    //% color=#a3a3c2
    //% targetAngle.min=0  targetAngle.max=359
    export function goToAbsolutePosition(motor: MotorConnector, targetAngle: number, turnMode: ServoMovementMode): void {
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
        
        let maxTime = getMotorDelay(100, 1, MotorMovementMode.Turns);
        waitForMotorMovementComplete(motor, maxTime);
    }

    //% weight=50
    //% subcategory="Motor / Servo"
    //% group="Servo Functions"
    //%block="%motor absolute angular position"
    //% color=#a3a3c2
    export function readServoAbsolutePostion(motor: MotorConnector): number {
        let buf = pins.createBuffer(8);
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x46;
        buf[5] = 0x00;
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        basic.pause(4);
        let arr = pins.i2cReadBuffer(i2cAddr, 4);
        let position = (arr[3] << 24) | (arr[2] << 16) | (arr[1] << 8) | (arr[0]);
        while (position < 0) {
            position += 3600;
        }
        return (position % 3600) * 0.1;
    }

    /*
     * Tank Mode Functions
     */
    let tankMotorLeft: MotorConnector = MotorConnector.M4;
    let tankMotorLeftReversed: boolean = true;
    let tankMotorRight: MotorConnector = MotorConnector.M1;
    let tankMotorRightReversed: boolean = false;
    let tankSpeed = 30;
    let wheelCircumferenceMm = 36 * Math.PI;

    export enum TurnDirection {
        //% block="left"
        Left,
        //% block="right"
        Right
    }

    //% weight=100
    //% block="Set robot motor right to %motor reverse %reverse"
    //% subcategory="Robot Tank Mode"
    //% group="Setup"
    //% motor.defl=MotorConnector.M1
    //% reverse.defl=false
    //% reverse.shadow="toggleYesNo"
    //% color=#E63022
    export function setTankMotorRight(motor: MotorConnector, reverse: boolean): void {
        tankMotorRight = motor;
        tankMotorRightReversed = reverse;
    }

    //% weight=95
    //% block="Set robot motor left to %motor reverse %reverse"
    //% subcategory="Robot Tank Mode"
    //% group="Setup"
    //% motor.defl=MotorConnector.M1
    //% reverse.defl=true
    //% reverse.shadow="toggleYesNo"
    //% color=#E63022
    export function setTankMotorLeft(motor: MotorConnector, reverse: boolean): void {
        tankMotorLeft = motor;
        tankMotorLeftReversed = reverse;
    }

    //% weight=90
    //% block="Set wheel diameter to %diameter %unit"
    //% subcategory="Robot Tank Mode"
    //% group="Setup"
    //% color=#E63022
    export function setTankWheelDiameter(diameter: number, unit: DistanceUnint): void {
        if (unit == DistanceUnint.cm)
        {
            wheelCircumferenceMm = diameter * Math.PI * 10;
        }
        else
        {
            wheelCircumferenceMm = diameter * Math.PI * 2.54 * 10;
        }
    } 

    //% weight=85
    //% block="Set speed to %speed"
    //% subcategory="Robot Tank Mode"
    //% group="Setup"
    //% color=#E63022
    //% speed.min=1 speed.max=100
    //% speed.defl=30
    function setTankSpeed(speed: number): void {
        tankSpeed = speed;
    }

    //% weight=100
    //% block="Drive %direction speed %speed"
    //% subcategory="Robot Tank Mode"
    //% group="Movement"
    //% speed.min=1 speed.max=100
    //% color=#E63022
    export function driveTank(direction: LinearDirection, speed: number): void {
        speed = (direction == LinearDirection.Forward) ? speed : -speed;
        let tmLSpeed = tankMotorLeftReversed ? -speed : speed;
        let tmRSpeed = tankMotorRightReversed ? -speed : speed;
        runMotor(tankMotorLeft, tmLSpeed);
        runMotor(tankMotorRight, tmRSpeed);
    }

    //% weight=95
    //% block="Stop movement"
    //% subcategory="Robot Tank Mode"
    //% group="Movement"
    //% color=#E63022
    export function stopTank(): void {
        stopMotor(tankMotorLeft);
        stopMotor(tankMotorRight);
    }

    //% weight=90
    //% block="Drive left motor %speedLeft\\% right motor %speedRight\\%"
    //% subcategory="Robot Tank Mode"
    //% group="Movement"
    //% speedLeft.min=-100 speedLeft.max=100
    //% speedRight.min=-100 speedRight.max=100
    //% color=#E63022
    export function driveTankDualSpeed(speedLeft: number, speedRight: number): void {
        let tmLSpeed = tankMotorLeftReversed ? -speedLeft : speedLeft;
        let tmRSpeed = tankMotorRightReversed ? -speedRight : speedRight;
        runMotor(tankMotorLeft, tmLSpeed);
        runMotor(tankMotorRight, tmRSpeed);
    }

    //% weight=85
    //% block="Drive %direction for %value %mode"
    //% subcategory="Robot Tank Mode"
    //% group="Movement"
    //% color=#E63022
    //% inlineInputMode=inline
    export function driveTankFor(direction: LinearDirection, value: number, mode: MotorMovementMode, wait?: boolean): void {
        let speed = (direction == LinearDirection.Forward) ? tankSpeed : -tankSpeed;
        let tmLSpeed = tankMotorLeftReversed ? -speed : speed;
        let tmRSpeed = tankMotorRightReversed ? -speed : speed;

        runMotorFor(tankMotorLeft, tmLSpeed, value, mode, false);
        runMotorFor(tankMotorRight, tmRSpeed, value, mode, true);
    }

}