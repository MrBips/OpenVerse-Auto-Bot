import axios from 'axios';
import cfonts from 'cfonts';
import gradient from 'gradient-string';
import chalk from 'chalk';
import fs from 'fs/promises';
import readline from 'readline';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import ProgressBar from 'progress';
import ora from 'ora';
import { ethers } from 'ethers';
import net from 'net';

// === Cấu hình Tor ControlPort ===
const TOR_CONTROL_PASSWORD = '.....'; // mat khau tor

const logger = {
  info: (msg, options = {}) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const emoji = options.emoji || 'ℹ️  ';
    const context = options.context ? `[${options.context}] ` : '';
    const level = chalk.green('INFO'); 
    const formattedMsg = `[ ${chalk.gray(timestamp)} ] ${emoji}${level} ${chalk.white(context.padEnd(25))}${chalk.white(msg)}`;
    console.log(formattedMsg);
  },
  warn: (msg, options = {}) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const emoji = options.emoji || '⚠️ ';
    const context = options.context ? `[${options.context}] ` : '';
    const level = chalk.yellow('WARN');
    const formattedMsg = `[ ${chalk.gray(timestamp)} ] ${emoji}${level} ${chalk.white(context.padEnd(25))}${chalk.white(msg)}`;
    console.log(formattedMsg);
  },
  error: (msg, options = {}) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const emoji = options.emoji || '❌ ';
    const context = options.context ? `[${options.context}] ` : '';
    const level = chalk.red('ERROR');
    const formattedMsg = `[ ${chalk.gray(timestamp)} ] ${emoji}${level} ${chalk.white(context.padEnd(25))}${chalk.white(msg)}`;
    console.log(formattedMsg);
  }
};

function delay(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

function centerText(text, width) {
  const cleanText = stripAnsi(text);
  const textLength = cleanText.length;
  const totalPadding = Math.max(0, width - textLength);
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;
  return `${' '.repeat(leftPadding)}${text}${' '.repeat(rightPadding)}`;
}

function printHeader(title) {
  const width = 80;
  console.log(gradient.morning(`┬${'─'.repeat(width - 2)}┬`));
  console.log(gradient.morning(`│ ${title.padEnd(width - 4)} │`));
  console.log(gradient.morning(`┴${'─'.repeat(width - 2)}┴`));
}

function printInfo(label, value, context) {
  logger.info(`${label.padEnd(15)}: ${chalk.cyan(value)}`, { emoji: '📍', context });
}

async function formatTaskTable(tasks, context) {
  console.log('\n');
  logger.info('Task List:', { context, emoji: '📋 ' });
  console.log('\n');

  const spinner = ora('Rendering tasks...').start();
  await new Promise(resolve => setTimeout(resolve, 1000));
  spinner.stop();

  const header = chalk.cyanBright('+----------------------+----------+-------+---------+\n| Task Name            | Category | Point | Status  |\n+----------------------+----------+-------+---------+');
  const rows = tasks.map(task => {
    const displayName = task.title && typeof task.title === 'string'
      ? (task.title.length > 20 ? task.title.slice(0, 17) + '...' : task.title)
      : 'Unknown Task';
    const status = task.status === 'completed' ? chalk.greenBright('Complte') : chalk.yellowBright('Pending');
    return `| ${displayName.padEnd(20)} | ${((task.category || 'N/A') + '     ').slice(0, 8)} | ${((task.points || 0).toString() + '    ').slice(0, 5)} | ${status.padEnd(6)} |`;
  }).join('\n');
  const footer = chalk.cyanBright('+----------------------+----------+-------+---------+');

  console.log(header + '\n' + rows + '\n' + footer);
  console.log('\n');
}

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0 (Edition cdf)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/102.0'
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function extractCookies(cookies) {
  if (!cookies) return '';
  const cookieParts = cookies.map(cookie => {
    const parts = cookie.split(';');
    return parts[0];
  });
  return cookieParts.join('; ');
}

function extractXsrfToken(cookie) {
  const xsrfTokenMatch = cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (!xsrfTokenMatch) return null;
  return decodeURIComponent(xsrfTokenMatch[1]);
}

function getGlobalHeaders(token, cookie, xsrfToken) {
  return {
    'accept': 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'authorization': `Bearer ${token}`,
    'cookie': cookie,
    'priority': 'u=1, i',
    'referer': 'https://launch.openverse.network/',
    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Opera";v="119"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': getRandomUserAgent(),
    'x-xsrf-token': xsrfToken
  };
}

function getLoginHeaders(cookie, xsrfToken) {
  return {
    'accept': 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'cookie': cookie,
    'origin': 'https://launch.openverse.network',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://launch.openverse.network/',
    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Opera";v="119"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': getRandomUserAgent(),
    'x-xsrf-token': xsrfToken
  };
}

function getAxiosConfig(proxy, token = null, cookie = null, xsrfToken = null, useGlobalHeaders = true, payload = null) {
  const headers = useGlobalHeaders ? getGlobalHeaders(token, cookie, xsrfToken) : getLoginHeaders(cookie, xsrfToken);
  if (payload && !useGlobalHeaders) {
    headers['Content-Length'] = Buffer.byteLength(JSON.stringify(payload)).toString();
  }
  const config = {
    headers,
    timeout: 60000,
    withCredentials: true
  };
  if (proxy) {
    config.httpsAgent = newAgent(proxy);
    config.proxy = false;
  }
  return config;
}

function newAgent(proxy) {
  if (proxy.startsWith('http://') || proxy.startsWith('https://')) {
    return new HttpsProxyAgent(proxy);
  } else if (proxy.startsWith('socks4://') || proxy.startsWith('socks5://')) {
    return new SocksProxyAgent(proxy);
  } else {
    logger.warn(`Unsupported proxy: ${proxy}`);
    return null;
  }
}

async function requestWithRetry(method, url, payload = null, config = {}, retries = 3, backoff = 2000, context) {
  for (let i = 0; i < retries; i++) {
    try {
      let response;
      if (method.toLowerCase() === 'get') {
        response = await axios.get(url, config);
      } else if (method.toLowerCase() === 'post') {
        response = await axios.post(url, payload, config);
      } else {
        throw new Error(`Method ${method} not supported`);
      }
      return response;
    } catch (error) {
      if (i < retries - 1) {
        logger.warn(`Retrying ${method.toUpperCase()} ${url} (${i + 1}/${retries})`, { emoji: '🔄', context });
        await delay(backoff / 1000);
        backoff *= 1.5;
        continue;
      }
      throw error;
    }
  }
}

async function readPrivateKeys() {
  try {
    const data = await fs.readFile('pk.txt', 'utf-8');
    const keys = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    logger.info(`Loaded ${keys.length} private key${keys.length === 1 ? '' : 's'}`, { emoji: '📄 ' });
    return keys;
  } catch (error) {
    logger.error(`Failed to read pk.txt: ${error.message}`, { emoji: '❌ ' });
    return [];
  }
}

async function getPublicIP(proxy, context) {
  try {
    const response = await requestWithRetry('get', 'https://api.ipify.org?format=json', null, getAxiosConfig(proxy, null, null, null, false), 3, 2000, context);
    return response.data.ip || 'Unknown';
  } catch (error) {
    logger.error(`Failed to get IP: ${error.message}`, { emoji: '❌ ', context });
    return 'Error retrieving IP';
  }
}

async function signMessage(privateKey, message) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(message);
    return signature;
  } catch (error) {
    logger.error(`Failed to sign message: ${error.message}`, { emoji: '❌ ' });
    throw error;
  }
}

async function login(privateKey, proxy, context) {
  const spinner = ora('Logging in...').start();
  try {
    const message = "Sign-in";
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;
    const sign = await signMessage(privateKey, message);

    const csrfResponse = await requestWithRetry('get', 'https://launch.openverse.network/sanctum/csrf-cookie', null, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'referer': 'https://launch.openverse.network/',
        'user-agent': getRandomUserAgent(),
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Opera";v="119"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      },
      withCredentials: true,
      httpsAgent: proxy ? newAgent(proxy) : null,
      proxy: false
    }, 3, 2000, context);

    let cookies = csrfResponse.headers['set-cookie'];
    if (!cookies) {
      throw new Error('No cookies received from CSRF endpoint');
    }

    let cookie = extractCookies(cookies);
    let xsrfToken = extractXsrfToken(cookie);
    if (!xsrfToken) {
      throw new Error('XSRF-TOKEN not found in cookies');
    }

    const payload = {
      address: address,
      referral_code: null,
      sign: sign
    };
    const payloadString = JSON.stringify(payload);
    const loginHeaders = {
      ...getLoginHeaders(cookie, xsrfToken),
      'Content-Length': payloadString.length.toString()
    };
    const loginResponse = await requestWithRetry('post', 'https://launch.openverse.network/api/bindLogin', payload, {
      headers: loginHeaders,
      withCredentials: true,
      httpsAgent: proxy ? newAgent(proxy) : null,
      proxy: false
    }, 3, 2000, context);

    if (loginResponse.data.res_code !== 0) {
      throw new Error(`Login failed: ${loginResponse.data.res_msg}`);
    }

    cookies = loginResponse.headers['set-cookie'];
    if (cookies) {
      cookie = extractCookies(cookies);
      xsrfToken = extractXsrfToken(cookie) || xsrfToken;
    }

    const accessToken = loginResponse.data.data.access_token;
    spinner.stop();
    return { accessToken, cookie, xsrfToken, address };
  } catch (error) {
    spinner.fail(chalk.bold.redBright(` Login failed: ${error.message}`));
    throw error;
  }
}

async function fetchTasks(token, cookie, xsrfToken, proxy, context) {
  const spinner = ora('Fetching tasks...').start();
  try {
    const userVisitResponse = await requestWithRetry('get', 'https://launch.openverse.network/api/task/userVisit/all', null, getAxiosConfig(proxy, token, cookie, xsrfToken), 3, 2000, context);
    const advanceVisitResponse = await requestWithRetry('get', 'https://launch.openverse.network/api/task/advanceVisit/all', null, getAxiosConfig(proxy, token, cookie, xsrfToken), 3, 2000, context);

    let newCookie = cookie;
    let newXsrfToken = xsrfToken;
    if (userVisitResponse.headers['set-cookie']) {
      newCookie = extractCookies(userVisitResponse.headers['set-cookie']);
      newXsrfToken = extractXsrfToken(newCookie) || newXsrfToken;
    }
    if (advanceVisitResponse.headers['set-cookie']) {
      newCookie = extractCookies(advanceVisitResponse.headers['set-cookie']);
      newXsrfToken = extractXsrfToken(newCookie) || newXsrfToken;
    }

    const tasks = [];
    const addTasks = (data, category) => {
      Object.values(data).forEach(task => {
        if (task.status === 1) {
          tasks.push({
            id: task.task_code,
            title: task.title,
            category: category,
            points: task.reward_point,
            status: 'pending'
          });
        }
      });
    };

    addTasks(userVisitResponse.data.data, 'UserVisit');
    addTasks(advanceVisitResponse.data.data, 'AdvanceVisit');

    spinner.stop();
    return { tasks, cookie: newCookie, xsrfToken: newXsrfToken };
  } catch (error) {
    spinner.fail(chalk.bold.redBright(` Failed to fetch tasks: ${error.message}`));
    return { error: `Failed: ${error.message}`, cookie, xsrfToken };
  }
}

async function completeTask(token, cookie, xsrfToken, task, proxy, context) {
  const taskContext = `${context}|T${task.id.slice(-6)}`;
  const spinner = ora(`Completing ${task.title}...`).start();
  try {
    const endpoint = task.category === 'UserVisit' 
      ? 'https://launch.openverse.network/api/task/userVisit/done'
      : 'https://launch.openverse.network/api/task/advanceVisit/done';
    
    const payload = { task_code: task.id };
    const payloadString = JSON.stringify(payload);
    const taskHeaders = {
      ...getGlobalHeaders(token, cookie, xsrfToken),
      'Content-Length': payloadString.length.toString(),
      'Content-Type': 'application/json'
    };
    const response = await requestWithRetry('post', endpoint, payload, {
      headers: taskHeaders,
      withCredentials: true,
      httpsAgent: proxy ? newAgent(proxy) : null,
      proxy: false
    }, 3, 2000, taskContext);

    let newCookie = cookie;
    let newXsrfToken = xsrfToken;
    if (response.headers['set-cookie']) {
      newCookie = extractCookies(response.headers['set-cookie']);
      newXsrfToken = extractXsrfToken(newCookie) || newXsrfToken;
    }

    if (response.data.res_code === 0) {
      spinner.succeed(chalk.bold.greenBright(` Task Completed ${task.title} [${task.category}]`));
      return { success: true, message: `Task "${task.title}" completed successfully`, cookie: newCookie, xsrfToken: newXsrfToken };
    } else if (response.data.res_msg === 'You have finished this task yet!') {
      spinner.succeed(chalk.bold.greenBright(` Task ${task.title} Already Done [ ${task.category} ]`));
      return { success: true, message: `Task "${task.title}" Already Completed`, cookie: newCookie, xsrfToken: newXsrfToken };
    } else {
      spinner.warn(chalk.bold.yellowBright(`Failed to complete ${task.title}: ${response.data.res_msg}`));
      return { success: false, message: `Failed: ${response.data.res_msg}`, cookie: newCookie, xsrfToken: newXsrfToken };
    }
  } catch (error) {
    spinner.fail(chalk.bold.redBright(` Failed to complete ${task.title}: ${error.message}`));
    return { success: false, message: `Failed: ${error.message}`, cookie, xsrfToken };
  }
}

async function fetchUserInfo(token, cookie, xsrfToken, proxy, context) {
  const spinner = ora('Fetching user info...').start();
  try {
    const response = await requestWithRetry('get', 'https://launch.openverse.network/api/user', null, getAxiosConfig(proxy, token, cookie, xsrfToken), 3, 2000, context);

    let newCookie = cookie;
    let newXsrfToken = xsrfToken;
    if (response.headers['set-cookie']) {
      newCookie = extractCookies(response.headers['set-cookie']);
      newXsrfToken = extractXsrfToken(newCookie) || newXsrfToken;
    }

    const data = response.data;
    spinner.succeed(chalk.bold.greenBright(` Fetched User: ${data.address}`));
    return { address: data.address, point: data.point, cookie: newCookie, xsrfToken: newXsrfToken };
  } catch (error) {
    spinner.fail(chalk.bold.redBright(` Failed to fetch user info: ${error.message}`));
    return { error: `Failed: ${error.message}`, cookie, xsrfToken };
  }
}

async function changeTorIP(controlPort = 9051, controlHost = '127.0.0.1', password = TOR_CONTROL_PASSWORD) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ port: controlPort, host: controlHost, timeout: 10000 }, () => {
      let authCmd = password ? `AUTHENTICATE \"${password}\"\r\n` : 'AUTHENTICATE\r\n';
      socket.write(authCmd);
    });
    let dataBuffer = '';
    let timeoutHandler = setTimeout(() => {
      socket.end();
      reject(new Error('Tor control port timeout'));
    }, 10000);
    socket.on('data', (data) => {
      dataBuffer += data.toString();
      if (dataBuffer.includes('250 OK')) {
        if (!dataBuffer.includes('250 OK\r\n250 OK')) {
          socket.write('SIGNAL NEWNYM\r\n');
          dataBuffer = '';
        } else {
          clearTimeout(timeoutHandler);
          socket.end();
          resolve();
        }
      } else if (dataBuffer.includes('515 Authentication failed')) {
        clearTimeout(timeoutHandler);
        socket.end();
        reject(new Error('Tor authentication failed'));
      }
    });
    socket.on('error', (err) => {
      clearTimeout(timeoutHandler);
      reject(err);
    });
    socket.on('timeout', () => {
      socket.end();
      reject(new Error('Tor control port connection timeout'));
    });
  });
}

async function processAccount(privateKey, index, total) {
  const context = `Account ${index + 1}/${total}`;
  logger.info(chalk.bold.magentaBright(`Starting account processing`), { emoji: '🚀 ', context });

  try {
    await changeTorIP();
    logger.info('Đã đổi IP Tor (SIGNAL NEWNYM)', { emoji: '🌀', context });
    await delay(5);
  } catch (err) {
  }

  printHeader(`Account Info ${context}`);
  const proxy = 'socks5://127.0.0.1:9050';
  let loginResult;
  try {
    logger.info('Đang login...', { emoji: '🔑', context });
    loginResult = await Promise.race([
      login(privateKey, proxy, context),
      delay(30).then(() => { throw new Error('Login timeout (30s)'); })
    ]);
  } catch (err) {
    logger.error('Login failed: ' + err.message, { emoji: '❌', context });
    logger.error('Skipping account due to login failure', { context });
    return;
  }
  if (!loginResult.accessToken) {
    logger.error('Skipping account due to login failure', { context });
    return;
  }

  let { accessToken, cookie, xsrfToken, address } = loginResult;
  let ip;
  try {
    logger.info('Đang lấy IP...', { emoji: '🌐', context });
    ip = await Promise.race([
      getPublicIP(proxy, context),
      delay(15).then(() => 'Timeout')
    ]);
  } catch (err) {
    ip = 'Error';
    logger.error('Lỗi lấy IP: ' + err.message, { emoji: '❌', context });
  }
  printInfo('Address', address, context);
  printInfo('IP', ip, context);
  console.log('\n');

  let tasksResult;
  try {
    logger.info('Đang lấy tasks...', { emoji: '📋', context });
    tasksResult = await Promise.race([
      fetchTasks(accessToken, cookie, xsrfToken, proxy, context),
      delay(30).then(() => { throw new Error('Fetch tasks timeout (30s)'); })
    ]);
  } catch (err) {
    logger.error(`Skipping account due to tasks error: ${err.message}`, { context });
    return;
  }
  if (tasksResult.error) {
    logger.error(`Skipping account due to tasks error: ${tasksResult.error}`, { context });
    return;
  }

  const tasks = tasksResult.tasks;
  cookie = tasksResult.cookie;
  xsrfToken = tasksResult.xsrfToken;

  if (tasks.length === 0) {
    logger.warn('No tasks available', { emoji: '⚠️ ', context });
    return;
  }

  const bar = new ProgressBar('Processing [:bar] :percent :etas', {
    complete: '█',
    incomplete: '░',
    width: 30,
    total: tasks.length
  });

  let completedTasks = 0;
  for (const task of tasks) {
    let result;
    try {
      logger.info(`Đang hoàn thành task: ${task.title}`, { emoji: '✅', context });
      result = await Promise.race([
        completeTask(accessToken, cookie, xsrfToken, task, proxy, context),
        delay(30).then(() => { throw new Error('Complete task timeout (30s)'); })
      ]);
    } catch (err) {
      logger.error(`Task ${task.title} failed: ${err.message}`, { emoji: '❌', context });
      continue;
    }
    if (result.success) {
      task.status = 'completed';
      completedTasks++;
    }
    cookie = result.cookie;
    xsrfToken = result.xsrfToken;
    bar.tick();
    await delay(2);
  }

  await formatTaskTable(tasks, context);
  logger.info(`Processed ${tasks.length} tasks: ${completedTasks} completed`, { emoji: '📊', context });

  printHeader(`Account Stats ${context}`);
  let userInfoResult;
  try {
    logger.info('Đang lấy user info...', { emoji: '👤', context });
    userInfoResult = await Promise.race([
      fetchUserInfo(accessToken, cookie, xsrfToken, proxy, context),
      delay(15).then(() => { throw new Error('Fetch user info timeout (15s)'); })
    ]);
  } catch (err) {
    logger.error(`Skipping stats due to error: ${err.message}`, { context });
    return;
  }
  if (userInfoResult.error) {
    logger.error(`Skipping stats due to error: ${userInfoResult.error}`, { context });
    return;
  }
  printInfo('Address', userInfoResult.address, context);
  printInfo('Total Point', userInfoResult.point, context);

  logger.info(chalk.bold.greenBright(`Completed account processing`), { emoji: '🎉 ', context });
}

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function runCycle() {
  const privateKeys = await readPrivateKeys();
  if (privateKeys.length === 0) {
    logger.error('No private keys found in token.txt. Exiting cycle.', { emoji: '❌ ' });
    return;
  }

  for (let i = 0; i < privateKeys.length; i++) {
    try {
      await processAccount(privateKeys[i], i, privateKeys.length);
    } catch (error) {
      logger.error(`Error processing account: ${error.message}`, { emoji: '❌ ', context: `Account ${i + 1}/${privateKeys.length}` });
    }
    if (i < privateKeys.length - 1) {
      console.log('\n\n');
    }
    await delay(5);
  }
}

async function run() {
  const terminalWidth = process.stdout.columns || 80;
  cfonts.say('OPENVERSE BY MR.BIP', {
    font: 'block',
    align: 'center',
    colors: ['cyan', 'magenta'],
    background: 'transparent',
    letterSpacing: 1,
    lineHeight: 1,
    space: true
  });
  console.log(gradient.retro(centerText('=== Bot Openverse Auto Complete Daily Task ===', terminalWidth)));
  console.log('\n');
  while (true) {
    await runCycle();
    logger.info(chalk.bold.yellowBright('Cycle completed. Waiting 24 hours...'), { emoji: '🔄 ' });
    await delay(86400);
  }
}

run().catch(error => logger.error(`Fatal error: ${error.message}`, { emoji: '❌' }));
