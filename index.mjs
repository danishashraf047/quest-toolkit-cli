import { execSync } from 'child_process';
import * as readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import os from 'os';

const properties = [
    {
        name: "debug.oculus.gpuLevel",
        hint: "(default=-1, 0-7)",
        question: "Enter value for debug.oculus.gpuLevel",
    },
    {
        name: "debug.oculus.cpuLevel",
        hint: "(default=-1, 0-5)",
        question: "Enter value for debug.oculus.cpuLevel",
    },
    {
        name: "debug.oculus.refreshRate",
        hint: "(default=-1, 60, 72, 90, 120)",
        question: "Enter value for debug.oculus.refreshRate",
    },
    {
        name: "debug.oculus.textureWidth",
        hint: "(default=-1, any value like 2560 or 3072)",
        question: "Enter value for debug.oculus.textureWidth",
    },
    {
        name: "debug.oculus.textureHeight",
        hint: "(default=-1, any value like 2560 or 3072)",
        question: "Enter value for debug.oculus.textureHeight",
    },
    {
        name: "debug.oculus.foveation.dynamic",
        hint: "(default=-1, disable=0, enable=1)",
        question: "Enter value for debug.oculus.foveation.dynamic",
    },
    {
        name: "debug.oculus.foveation.level",
        hint: "(default=-1, 0-4)",
        question: "Enter value for debug.oculus.foveation.level (debug.oculus.foveation.dynamic must be disabled to set this property.)",
    }
];

const EXIT_KEY = 'e';
const CHECK_DEVICES_INTERVAL = 1000;

let rl = null;
let runScriptCount = 0;

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
    if (key.name === EXIT_KEY) {
        console.log('\n\nExiting...');
        if (rl) rl.close();
        clearConsole();
        process.exit();
    }
});

function getOS() {
    const platform = os.platform();
    if (platform === 'darwin') {
        return 'mac';
    } else if (platform === 'win32') {
        return 'win';
    } else if (platform === 'linux') {
        return 'linux';
    } else {
        return 'unknown';
    }
}

let adbCommand = undefined;

switch (getOS()) {
    case 'mac':
        adbCommand = 'platform-tools-mac/adb'
        break;
    case 'win':
        adbCommand = 'platform-tools-win/adb.exe';
        break;
    case 'linux':
        adbCommand = 'platform-tools-linux/adb';
        break;
    default:
        adbCommand = null;
}
if (!adbCommand) {
    console.log(chalk.red('Unsupported OS. Please use Mac, Windows or Linux.'));
    process.exit();
}

function createReadlineInterface() {
    if (rl) {
        rl.close();
    }
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

function rebootHomeEnvironment() {
    try {
        execSync(`${adbCommand} shell am force-stop com.oculus.vrshell`);
    } catch (error) {
        clearConsole();
        printSeparator();
        // console.log(chalk.red('Error rebooting home environment: ', error.message));
        console.log(chalk.red('Device not connected. Please connect your device and try again.'));
        printSeparator();
    }
}

async function checkDevices() {
    const spinner = ora('Checking devices...').start();

    while (true) {
        try {
            const result = execSync(`${adbCommand} devices -l`).toString();
            const lines = result.split('\n');
            const deviceLines = lines.filter(line => line.includes('device'));
            if (deviceLines.length > 1) {
                spinner.succeed('Device connected\n');
                return true;
            } else {
                await new Promise(resolve => setTimeout(resolve, CHECK_DEVICES_INTERVAL));
            }
        } catch (error) {
            spinner.fail(`Error checking devices: ${error.message}`);
            return false;
        }
    }
}

function getProperty(property) {
    try {
        const result = execSync(`${adbCommand} shell getprop ${property}`).toString();
        printSeparator();
        console.log(`${property}:`, result.trim());
        printSeparator();
    } catch (error) {
        clearConsole();
        printSeparator();
        // console.log(chalk.red('Error getting property: ', error.message));
        console.log(chalk.red('Device not connected. Please connect your device and try again.'));
        printSeparator();
    }
}

function displayMainMenu() {
    console.log("Select an option:");
    console.log("1. Set Properties");
    console.log("2. Show Properties");
    console.log("3. Reboot Home Environment");
}

function displayPropertiesMenu() {
    console.log("Select a property to show:");
    properties.forEach((property, index) => {
        console.log(`${index + 1}. ${property.name}`);
    });
    console.log(`${properties.length + 1}. Show all properties`);
    console.log(`${properties.length + 2}. Back to main menu`);
}

function clearConsole() {
    process.stdout.write('\u001Bc');
    console.clear();
}

function printSeparator() {
    console.log("--------------------------------------------------");
}

async function handlePropertiesMenu() {
    console.log(chalk.yellow('Press "e" to exit the program\n'));

    displayPropertiesMenu();

    createReadlineInterface();

    rl.question(chalk.green(`\nEnter your choice (1-${properties.length + 2}): `), (propertyChoice) => {
        const choice = parseInt(propertyChoice, 10) - 1;
        if (choice >= 0 && choice < properties.length) {
            clearConsole();
            getProperty(properties[choice].name);
        } else if (choice === properties.length) {
            clearConsole();
            properties.forEach(property => getProperty(property.name));
        } else if (choice === properties.length + 1) {
            console.log("Back to main menu...");
            clearConsole();
            runScript();
            return;
        } else {
            clearConsole();
            printSeparator();
            console.log(`Invalid choice. Please enter a number between 1 and ${properties.length + 2}.`);
            printSeparator();
        }

        handlePropertiesMenu();
    });
}

async function setProperty(propertyName, question, hint) {
    return new Promise((resolve) => {
        rl.question(`${chalk.green(question)} ${chalk.grey(hint)}: `, (value) => {
            if (value !== '') {
                try {
                    execSync(`${adbCommand} shell setprop ${propertyName} ${value}`);
                } catch (error) {
                    // console.log(chalk.red('Error setting property: ', error.message));
                    console.log(chalk.red('Device not connected. Please connect your device and try again.'));
                }
            }
            resolve();
        });
    });
}

async function runScript() {
    if (runScriptCount === 0) {
        clearConsole();
    }
    runScriptCount++;

    console.log(chalk.yellow('Press "e" to exit the program\n'));
    const deviceConnected = await checkDevices();

    if (!deviceConnected) {
        return;
    }

    displayMainMenu();

    createReadlineInterface();

    rl.question(chalk.green("\nEnter your choice (1-3): "), (choice) => {
        switch (choice) {
            case '1':
                clearConsole();
                console.log(chalk.yellow('Press "e" to exit the program\n'));

                properties.reduce((promise, property, index) => {
                    return promise.then(() => setProperty(property.name, property.question, property.hint));
                }, Promise.resolve()).then(() => { clearConsole(); rl.close(); runScript(); });
                break;
            case '2':
                clearConsole();
                handlePropertiesMenu();
                break;
            case '3':
                clearConsole();
                rebootHomeEnvironment();
                runScript();
                break;
            default:
                clearConsole();
                printSeparator();
                console.log("Invalid choice. Please enter a number between 1 and 3.");
                printSeparator();
                runScript();
        }
    });
}

runScript();