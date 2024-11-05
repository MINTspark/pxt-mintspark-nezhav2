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

    export enum LinearDirection {
        //%block="forward"
        Forward = 1,
        //%block="backward"
        Backward = 2
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

    /*
    * Motor / Servo Functions
    */

    //% weight=110
    //% block="Run motor %motor at speed %speed\\%"
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //% speed.min=-100 speed.max=100
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    //% color=#E63022
    export function runMotor(motor: NezhaV2MotorPostion, speed: number): void {
        speed = restrictSpeed(speed);
        nezhaV2.nezha2MotorSpeedCtrolExport(motor, speed);
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
    //% group="Motor Functions"
    //% block="Stop motor %motor"
    //% color=#E63022
    export function stopMotor(motor: NezhaV2MotorPostion): void {
        stopDrive = true;
        nezhaV2.nezha2MotorSpeedCtrolExport(motor, 0);
    }

    //% weight=90
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //% block="Stop all motors"
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

    //% weight=49
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //%block="%NezhaV2MotorPostion speed (rpm)"
    //% color=#E63022
    export function readServoAbsoluteSpeed(motor: NezhaV2MotorPostion): number {
        return nezhaV2.readServoAbsoluteSpeed(motor) * 2;
    }

    //% weight=80
    //% subcategory="Motor / Servo"
    //% group="Servo Functions"
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
    //% group="Servo Functions"
    //%block="%NezhaV2MotorPostion absolute angular position"
    //% color=#a3a3c2
    export function readServoAbsolutePostion(motor: NezhaV2MotorPostion): number {
        return nezhaV2.readServoAbsolutePostion(motor);
    }

    /*
     * Tank Mode Functions
     */
    let tankMotorLeft: NezhaV2MotorPostion = NezhaV2MotorPostion.M4;
    let tankMotorLeftReversed: boolean = true;
    let tankMotorRight: NezhaV2MotorPostion = NezhaV2MotorPostion.M1;
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
    //% motor.defl=neZha.MotorList.M1
    //% reverse.defl=false
    //% reverse.shadow="toggleYesNo"
    //% color=#E63022
    export function setTankMotorRight(motor: NezhaV2MotorPostion, reverse: boolean): void {
        tankMotorRight = motor;
        tankMotorRightReversed = reverse;
    }

    //% weight=95
    //% block="Set robot motor left to %motor reverse %reverse"
    //% subcategory="Robot Tank Mode"
    //% group="Setup"
    //% motor.defl=neZha.MotorList.M4
    //% reverse.defl=true
    //% reverse.shadow="toggleYesNo"
    //% color=#E63022
    export function setTankMotorLeft(motor: NezhaV2MotorPostion, reverse: boolean): void {
        tankMotorLeft = motor;
        tankMotorLeftReversed = reverse;
    }

    //% weight=90
    //% block="Set wheel diameter to %diameter mm"
    //% subcategory="Robot Tank Mode"
    //% group="Setup"
    //% color=#E63022
    export function setTankWheelDiameter(diameter: number): void {
        wheelCircumferenceMm = diameter * Math.PI;
    } 

    //% weight=85
    //% block="Set speed to %speed"
    //% subcategory="Robot Tank Mode"
    //% group="Setup"
    //% color=#E63022
    //% speed.min=1 speed.max=100
    export function setTankSpeed(speed: number): void {
        tankSpeed = speed;
    }

    //% weight=100
    //% block="Move %direction"
    //% subcategory="Robot Tank Mode"
    //% group="Movement"
    //% color=#E63022
    export function moveTank(direction: LinearDirection): void {
        let speed = tankSpeed;

        if (direction == LinearDirection.Backward)
        {
            speed = -speed;
        }
        
        let tm1Speed = tankMotorLeftReversed ? -speed : speed;
        let tm2Speed = tankMotorRightReversed ? -speed : speed;
        runMotor(tankMotorLeft, tm1Speed);
        runMotor(tankMotorRight, tm2Speed);
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
}