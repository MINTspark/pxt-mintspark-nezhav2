enum DistanceUnint {
    //%block="cm"
    Cm = 1,
    //%block="inch"
    Inch = 2
}

enum MotorContinuationMode {
    //%block="yes"
    Wait = 1,
    //%block="no"
    Continue = 2
}

enum MotorConnector {
    //%block="M1"
    M1 = 1,
    //%block="M2"
    M2 = 2,
    //%block="M3"
    M3 = 3,
    //%block="M4"
    M4 = 4
}

enum MotorMovementMode {
    //%block="turns"
    Turns = 1,
    //%block="degrees"
    Degrees = 2,
    //%block="seconds"
    Seconds = 3
}

enum MotorRotationDirection {
    //%block="clockwise"
    CW = 1,
    //%block="counterclockwise"
    CCW = 2
}

enum ServoMovementMode {
    //%block="shortest path"
    ShortPath = 1,
    //%block="clockwise"
    CW = 2,
    //%block="counterclockwise"
    CCW = 3
}

enum LinearDirection {
    //%block="forward"
    Forward = 1,
    //%block="backward"
    Backward = 2
}

enum TurnDirection {
    //% block="left"
    Left,
    //% block="right"
    Right
}

//% weight=100 color=#DC22E1 block="MINTspark Nezha V2" blockId="MINTspark Nezha V2" icon="\uf0e7"
//% subcategories='["Motor / Servo", "Robot Tank Drive"]'
//% groups='["Motor Functions", "Servo Functions", "Information", "Setup", "Movement"]'
namespace ms_nezhaV2 {
    /*
     * NeZha V2
     */
    export let robotTankModeMovementChange = false;
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

    /**
     * Runs the selected motor at a certain speed.
     */
    //% weight=110
    //% block="Run motor %motor at speed %speed"
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //% speed.min=-100 speed.max=100 speed.defl=20
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    //% color=#0f8c1c
    //% help=github:pxt-mintspark-nezhav2/README
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
    
    /**
     * Runs the selected motor at a certain speed for a the set amount of rotations, degrees or seconds.
     * By expanding the block the user can also specify if the code should wait until the movement is complete (Yes) or if the code should continue to execute straight away (No).
     * By default (when the block is not expanded) the code will wait until the movement is completed.
     */
    //% weight=100
    //% block="Run motor %motor at speed %speed for %value %mode || wait complete %wait"
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //% speed.min=-100 speed.max=100 speed.defl=20
    //% wait.defl=true
    //% value.defl=1
    //% wait.shadow="toggleYesNo"
    //% inlineInputMode=inline
    //% color=#0f8c1c
    //% help=github:pxt-mintspark-nezhav2/README
    export function runMotorFor(motor: MotorConnector, speed: number, value: number, mode: MotorMovementMode, wait?: boolean): void {
        speed = restrictSpeed(speed);
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

        if (!(wait == false)) {
            waitForMotorMovementComplete(motor, getMotorDelay(speed, value, mode) + 100);
        }
    }

    let currentMotorSpeeds: number[] = [];
    let currentMotorSpeedsLastRead: number[] = [0,0,0,0,0];
    let currentAggregatedAngle: number[] = [];
    let currentAggregatedAngleLastRead: number[] = [0, 0, 0, 0, 0];
    let readMotorValueIntervalMs = 10;

    /**
     * Reads the current speed of the selected motor in revolutions per minute (rpm).
     */
    //% weight=98
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //%block="%motor speed (rpm)"
    //% color=#0f8c1c
    //% help=github:pxt-mintspark-nezhav2/README
    export function readServoAbsoluteSpeed(motor: MotorConnector): number {
        // Only update if last update is stale
        if (currentMotorSpeedsLastRead[motor] + readMotorValueIntervalMs < input.runningTime())
        {
            return readServoAbsoluteSpeedInternal(motor);
        }

        return currentMotorSpeeds[motor];
    }

    function readServoAbsoluteSpeedInternal(motor: MotorConnector): number {
        if (motorReadInProgress) return currentMotorSpeeds[motor];

        motorReadInProgress = true;
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
        motorReadInProgress = false;
        let Servo1Speed = (ServoSpeed1Arr[1] << 8) | (ServoSpeed1Arr[0]);
        currentMotorSpeeds[motor] = Math.floor(Servo1Speed * 0.17);
        currentMotorSpeedsLastRead[motor] = input.runningTime();
        return currentMotorSpeeds[motor];
    }

    /**
     * Stops the selected motor.
     */
    //% weight=95
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //% block="Stop motor %motor"
    //% color=#E63022
    //% help=github:pxt-mintspark-nezhav2/README
    export function stopMotor(motor: MotorConnector): void {
        runMotor(motor, 0);
    }

    /**
     * Stops all motors.
     */
    //% weight=90
    //% subcategory="Motor / Servo"
    //% group="Motor Functions"
    //% block="Stop all motors"
    //% color=#E63022
    //% help=github:pxt-mintspark-nezhav2/README
    export function stopAllMotor(): void {
        runMotor(MotorConnector.M1, 0);
        runMotor(MotorConnector.M2, 0);
        runMotor(MotorConnector.M3, 0);
        runMotor(MotorConnector.M4, 0);
    }

    function setServoSpeed(motor: MotorConnector, speed: number): void {
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

    // A function to block the thread until a motor movement is completed or the max time has elapsed
    function waitForMotorMovementComplete(motor: MotorConnector, maxTime: number): void {
        basic.pause(100);
        let startTime = input.runningTime();
        while (readServoAbsoluteSpeedInternal(motor) > 0 && (input.runningTime() - startTime) < maxTime) {
            basic.pause(100);
        }
    }

    /**
     * Moves the selected motor to the selected angle (in a range of 0 to 359) at the selected speed.
     * Required rotation can be selected to move clockwise, counterclockwise or fastest route.
     * The 0 angle position of the motor is the position the motor is in when the Nezha V2 Block is switched on or when the motor is connected.
     */
    //% weight=80
    //% subcategory="Motor / Servo"
    //% group="Servo Functions"
    //% block="Turn motor %motor with speed %speed to absolute angle %angle° move %turnmode"
    //% color=#5285bf
    //% speed.min=1 speed.max=100 speed.defl=20
    //% targetAngle.min=0  targetAngle.max=359
    //% inlineInputMode=inline
    //% help=github:pxt-mintspark-nezhav2/README 
    export function goToAbsolutePositionFromCode(motor: MotorConnector, speed: number, targetAngle: number, turnMode: ServoMovementMode): void {
        // Calculate required movement in degrees
        let currentPosition = readServoAbsolutePostionInternal(motor);
        let requiredChange = targetAngle - currentPosition;
        if (Math.abs(requiredChange) <= 2) return;

        let clockwise = Math.abs(requiredChange < 0 ? requiredChange + 360 : requiredChange);
        let counterclockwise = Math.abs(requiredChange > 0 ? requiredChange - 360 : requiredChange);
        let degreesToMove = clockwise;

        if (turnMode == ServoMovementMode.ShortPath)
        {
            turnMode = counterclockwise > clockwise ? ServoMovementMode.CW : ServoMovementMode.CCW;
        }

        if (turnMode == ServoMovementMode.CCW)
        {
            degreesToMove = counterclockwise;
            speed = -Math.abs(speed);
        }
        
        runMotorFor(motor, speed, degreesToMove, MotorMovementMode.Degrees, true);
    }

    /**
     * Original hardware controller implementation. Can suffer from lock up if more than one command is executed.
     */
    function goToAbsolutePosition(motor: MotorConnector, targetAngle: number, turnMode: ServoMovementMode): void {

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

    /**
     * Reads the angle the motor is currently at (range 0 to 359).
     * The 0 angle position of the motor is the position the motor is in when the Nezha V2 Block is switched on or when the motor is connected.
     */
    //% weight=50
    //% subcategory="Motor / Servo"
    //% group="Servo Functions"
    //%block="%motor angular position (0 to 359)"
    //% color=#5285bf
    //% help=github:pxt-mintspark-nezhav2/README
    export function readServoAbsolutePostion(motor: MotorConnector): number {
        let aggreggatePosition = readServoAbsolutePostionAggregate(motor);
        return Math.round((aggreggatePosition % 360 + 360) % 360);
    }

    function readServoAbsolutePostionInternal(motor: MotorConnector): number {
        let aggreggatePosition = readServoAbsolutePostionAggregateInternal(motor);
        return Math.round((aggreggatePosition % 360 + 360) % 360);
    }

    /**
    * Reads a running total of degrees the motor has turned since start
    * The value is initially 0 when the Nezha V2 Block is switched on or when the motor is connected.
    * Thereafter every movement forward or back increments or decrements this value.
    * This can be used to easily caluclate a difference in degrees from one point in time to another
    */
    //% weight=45
    //% subcategory="Motor / Servo"
    //% group="Servo Functions"
    //%block="%motor aggregated angular position"
    //% color=#5285bf
    //% help=github:pxt-mintspark-nezhav2/README
    export function readServoAbsolutePostionAggregate(motor: MotorConnector): number {
        // Only update if last update is stale
        if (currentAggregatedAngleLastRead[motor] + readMotorValueIntervalMs < input.runningTime()) {
            return readServoAbsolutePostionAggregateInternal(motor);
        }

        return currentAggregatedAngle[motor];
    }

    let motorReadInProgress = false;
    function readServoAbsolutePostionAggregateInternal(motor: MotorConnector): number {
        if (motorReadInProgress) return currentAggregatedAngle[motor];

        motorReadInProgress = true;
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
        motorReadInProgress = false;
        let position = (arr[3] << 24) | (arr[2] << 16) | (arr[1] << 8) | (arr[0]);
        currentAggregatedAngle[motor] = Math.round(position * 0.1);
        currentAggregatedAngleLastRead[motor] = input.runningTime();
        return currentAggregatedAngle[motor];
    }

    /*
     * Tank Mode Functions
     */
    export let tankMotorLeft: MotorConnector = MotorConnector.M4;
    export let tankMotorLeftReversed: boolean = true;
    export let tankMotorRight: MotorConnector = MotorConnector.M1;
    export let tankMotorRightReversed: boolean = false;
    export let wheelLinearDegreePerMm = 360.0 / (36 * Math.PI);
    export let wheelBaseSpotTurnMmPerDegree = 75 * Math.PI / 360.0;

    /**
     * Tank drive is a robot configuration where driving and steering is achieved by varying the speed of two parallel mounted motors. Typically in this design there is an additional caster or omni wheel which can move freely in all directions. *** To use the blocks in this section the following parameters must be set: * Right and left drive motors * The wheel diameter of the robot * The wheelbase distance of the robot. *** Depending on how a motor is fixed to the robot body it might be necessary to reverse the motor to ensure that the motor works in the correct sense. *** The wheel diameter is used to calculate how far a robot wheel has travelled. *** The wheelbase distance is used to calculate the required distances each wheel has to tavel for spot turns. If you find that the spot turn block is not accurate then adjust this value to fine tune. *** The wheel diameter and wheelbase distance an be entered in cm or inch by selecting the required unit.
     */
    //% weight=110
    //% block="Setup Tank Drive:|Motor right is %motorR|Motor right reversed %reverseR|Motor left is %motorL|Motor left reversed %reverseL|Wheel diameter is %wheelDiameter|Wheelbase distance is %wheelbase|Unit: %unit"
    //% subcategory="Robot Tank Drive"
    //% group="Setup"
    //% motorR.defl=MotorConnector.M1
    //% motorL.defl=MotorConnector.M4
    //% reverseL.defl=true
    //% reverseL.shadow="toggleYesNo"
    //% reverseR.defl=false
    //% reverseR.shadow="toggleYesNo"
    //% wheelDiameter.defl=3.6
    //% wheelbase.defl=10
    //% unit.defl=DistanceUnint.Cm
    //% color=#6c7075
    //% help=github:pxt-mintspark-nezhav2/README
    //% inlineInputMode=external
    export function setupTankModeRobot(motorR: MotorConnector, reverseR: boolean, motorL: MotorConnector, reverseL: boolean, wheelDiameter: number, wheelbase: number, unit: DistanceUnint): void {
        // Motor allocation
        tankMotorRight = motorR;
        tankMotorRightReversed = reverseR;
        tankMotorLeft = motorL;
        tankMotorLeftReversed = reverseL;

        // Set wheel data
        let wheelCircumferenceMm = wheelDiameter * Math.PI * 10;
        if (unit == DistanceUnint.Inch) {
            wheelCircumferenceMm = wheelCircumferenceMm * 2.54;
        }
        wheelLinearDegreePerMm = 360.0 / wheelCircumferenceMm;

        // Set wheelbase data
        let wheelBaseDiameterMm = wheelbase * Math.PI * 10;
        if (unit == DistanceUnint.Inch) {
            wheelBaseDiameterMm = wheelBaseDiameterMm * 2.54;
        }
        wheelBaseSpotTurnMmPerDegree = wheelBaseDiameterMm / 360.0;
    }

    /**
     * Stops the tank drive robot's movement.
     */
    //% weight=105
    //% block="Stop movement"
    //% subcategory="Robot Tank Drive"
    //% group="Movement"
    //% color=#E63022
    //% help=github:pxt-mintspark-nezhav2/README
    export function stopTank(): void {
        robotTankModeMovementChange = true;
        stopMotor(tankMotorLeft);
        stopMotor(tankMotorRight);
    }

    /**
     * Starts to drive the tank drive robot forward or backward at the set speed.
     */
    //% weight=100
    //% block="Drive %direction speed %speed"
    //% subcategory="Robot Tank Drive"
    //% group="Movement"
    //% speed.min=1 speed.max=100 speed.defl=20
    //% color=#0f8c1c
    //% help=github:pxt-mintspark-nezhav2/README
    export function driveTank(direction: LinearDirection, speed: number): void {
        robotTankModeMovementChange = true;
        speed = (direction == LinearDirection.Forward) ? speed : -speed;
        let tmLSpeed = tankMotorLeftReversed ? -speed : speed;
        let tmRSpeed = tankMotorRightReversed ? -speed : speed;
        runMotor(tankMotorLeft, tmLSpeed);
        runMotor(tankMotorRight, tmRSpeed);
    }

    /**
     * Drives the tank drive robot forward or backward at the set speed for the set amount of wheel turns, wheel degrees or seconds.
     */
    //% weight=85
    //% block="Drive %direction speed %speed for %value %mode"
    //% subcategory="Robot Tank Drive"
    //% group="Movement"
    //% color=#0f8c1c
    //% speed.min=1 speed.max=100 speed.defl=20
    //% value.defl=1
    //% mode.defl=MotorMovementMode.Turns
    //% inlineInputMode=inline
    //% help=github:pxt-mintspark-nezhav2/README
    export function driveTankFor(direction: LinearDirection, speed: number, value: number, mode: MotorMovementMode): void {
        value = Math.abs(value);
        robotTankModeMovementChange = true;
        speed = (direction == LinearDirection.Forward) ? speed : -speed;
        let tmLSpeed = tankMotorLeftReversed ? -speed : speed;
        let tmRSpeed = tankMotorRightReversed ? -speed : speed;

        runMotorFor(tankMotorLeft, tmLSpeed, value, mode);
        runMotorFor(tankMotorRight, tmRSpeed, value, mode);
    }

    /**
     * Drives the tank drive robot forward or backward at the set speed for the set amount of centimeters or inches.
     * The wheel diameter must be set before this block is used!
     */
    //% weight=80
    //% block="Drive %direction speed %speed for %distance %unit"
    //% subcategory="Robot Tank Drive"
    //% group="Movement"
    //% color=#0f8c1c
    //% speed.min=1 speed.max=100 speed.defl=20
    //% distance.defl=10
    //% unit.defl=DistanceUnint.Cm
    //% inlineInputMode=inline
    //% help=github:pxt-mintspark-nezhav2/README
    export function driveTankForDistance(direction: LinearDirection, speed: number, distance: number, unit: DistanceUnint): void {
        robotTankModeMovementChange = true;
        speed = Math.abs(speed);
        speed = (direction == LinearDirection.Forward) ? speed : -speed;
        let tmLSpeed = tankMotorLeftReversed ? -speed : speed;
        let tmRSpeed = tankMotorRightReversed ? -speed : speed;

        // Calculate required degrees for distance
        let distMm = (unit == DistanceUnint.Cm) ? distance * 10 : distance * 10 * 2.54;
        let requiredDegrees = distMm * wheelLinearDegreePerMm;

        runMotorFor(tankMotorLeft, tmLSpeed, requiredDegrees, MotorMovementMode.Degrees);
        runMotorFor(tankMotorRight, tmRSpeed, requiredDegrees, MotorMovementMode.Degrees);
    }

    /**
     * Spot turns the tank drive robot left or right for the set amount of degrees.
     * The wheelbase distance must be set before this block is used!
     * The wheelbase distance is used to calculate the spot turn. If you find that the spot turn is not accurate then adjust the wheelbase value to fine tune.
     */
    //% weight=75
    //% block="Spot turn %direction speed %speed for %degrees degrees"
    //% subcategory="Robot Tank Drive"
    //% group="Movement"
    //% color=#5285bf
    //% speed.min=1 speed.max=100 speed.defl=20
    //% degrees.defl=90
    //% direction.defl=TurnDirection.Left
    //% inlineInputMode=inline
    //% help=github:pxt-mintspark-nezhav2/README
    export function spotTurnTankForDegrees(direction: TurnDirection, speed: number, degrees: number): void {
        robotTankModeMovementChange = true;
        speed = (direction == TurnDirection.Left) ? speed : -speed;
        let tmLSpeed = (tankMotorLeftReversed ? -speed : speed) * -1;
        let tmRSpeed = tankMotorRightReversed ? -speed : speed;

        // Calculate required degrees for turn
        let requiredDistanceMm = wheelBaseSpotTurnMmPerDegree * degrees;
        let requiredDegrees = requiredDistanceMm * wheelLinearDegreePerMm;

        runMotorFor(tankMotorLeft, tmLSpeed, requiredDegrees, MotorMovementMode.Degrees);
        runMotorFor(tankMotorRight, tmRSpeed, requiredDegrees, MotorMovementMode.Degrees);
    }

    /**
     * Drives the tank drive robot with independent speeds for each motor for the set amount of seconds.
     * By setting different speeds, the robot can carry out turns of different radii.
     */
    //% weight=65
    //% block="Drive left motor %speedLeft\\% right motor %speedRight\\% || for %seconds seconds"
    //% subcategory="Robot Tank Drive"
    //% group="Movement"
    //% speedLeft.min=-100 speedLeft.max=100 speedLeft.defl=20
    //% speedRight.min=-100 speedRight.max=100 speedRight.defl=20
    //% inlineInputMode=inline
    //% color=#5285bf
    //% help=github:pxt-mintspark-nezhav2/README
    export function driveTankDualSpeedForSeconds(speedLeft: number, speedRight: number, seconds?: number): void {
        robotTankModeMovementChange = true;
        let tmLSpeed = tankMotorLeftReversed ? -speedLeft : speedLeft;
        let tmRSpeed = tankMotorRightReversed ? -speedRight : speedRight;
        let timeMs = seconds * 1000;
        runMotor(tankMotorLeft, tmLSpeed);
        runMotor(tankMotorRight, tmRSpeed);

        if (seconds == null)
        {
            return;
        }

        let startTime = input.runningTime();
        while (input.runningTime() - startTime < timeMs) {
            basic.pause(100);
        }

        runMotor(tankMotorLeft, 0);
        runMotor(tankMotorRight, 0);
    }

    /**
     * Reads the current firmware version of the connected Nezha V2 block. Ensure that the Nezha block is fully initialised before using this block.
     */
    //% weight=100
    //% block="NezhaV2 Block Firmware Version"
    //% subcategory="Motor / Servo"
    //% group="Information"
    //% color=#E63022
    //% weight=320
    //% help=github:pxt-mintspark-nezhav2/README
    export function readVersion(): string {
        let buf = pins.createBuffer(8);
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = 0x00;
        buf[3] = 0x00;
        buf[4] = 0x88;
        buf[5] = 0x00;
        buf[6] = 0x00;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        let version = pins.i2cReadBuffer(i2cAddr, 3);
        return `V ${version[0]}.${version[1]}.${version[2]}`;
    }
}