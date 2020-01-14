const path = require('path');
const childProcess = require('child_process');
const node_ssh = require('node-ssh');
const { successLog, errorLog, underlineLog } = require('../utils/index');
const projectDir = process.cwd();

let ssh = new node_ssh(); // 生成ssh实例

// 部署流程入口
async function deploy(config) {
  const { script, webDir, distPath, projectName, name } = config;
  execBuild(script);
  await connectSSH(config);
  await clearOldFile(config.webDir);
  await uploadDirectory(distPath, webDir);
  successLog(`\n 恭喜您，${underlineLog(projectName)}项目${underlineLog(name)}部署成功了^_^\n`);
  process.exit(0);
}

// 第一步，执行打包脚本
function execBuild(script) {
  try {
    console.log(`\n（1）${script}`);
    childProcess.execSync(`${script}`);
    successLog('  打包成功');
  } catch (err) {
    errorLog(err);
    process.exit(1);
  }
}

// 第二步，连接SSH
async function connectSSH(config) {
  const { host, port, username, password, privateKey, passphrase, distPath } = config;
  const sshConfig = {
    host,
    port,
    username,
    password,
    privateKey,
    passphrase
  };
  try {
    console.log(`（2）连接${underlineLog(host)}`);
    await ssh.connect(sshConfig);
    successLog('  SSH连接成功');
  } catch (err) {
    errorLog(`  连接失败 ${err}`);
    process.exit(1);
  }
}

// 运行命令
async function runCommand(command, webDir) {
  await ssh.execCommand(command, { cwd: webDir });
}

// 第三步，清空远端目录
async function clearOldFile(webDir) {
  try {
    console.log('（3）清空远端目录');
    await runCommand(`cd ${webDir}`, webDir);
    await runCommand(`rm -rf *`, webDir);
    successLog('  远端目录清空成功');
  } catch (err) {
    errorLog(`  远端目录清空失败 ${err}`);
    process.exit(1);
  }
}

// 第四步，上传文件夹
async function uploadDirectory(distPath, webDir) {
  try {
    console.log(`(4)上传文件到${underlineLog(webDir)}`);
    await ssh.putDirectory(path.resolve(projectDir, distPath), webDir, {
      recursive: true,
      concurrency: 10,
    });
    successLog('  文件上传成功');
  } catch (err) {
    errorLog(`  文件传输异常 ${err}`);
    process.exit(1);
  }
}

module.exports = deploy;