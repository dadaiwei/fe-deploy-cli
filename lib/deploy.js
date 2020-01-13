const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const node_ssh = require('node-ssh');
const archiver = require('archiver');
const { successLog, errorLog, underlineLog } = require('../utils/index');
const projectDir = process.cwd();

let ssh = new node_ssh(); // 生成ssh实例

// 部署流程入口
function deploy(config) {
  const { script } = config;
  try {
    console.log(`\n（1）${script}`);
    childProcess.execSync(`${script}`);
    successLog('  打包成功');
    startZip(config);
  } catch (err) {
    errorLog(err);
    process.exit(1);
  }
}

// 开始打包
function startZip(config) {
  let { distPath, host } = config;
  distPath = path.resolve(projectDir, distPath);
  console.log('（2）打包成zip');
  const archive = archiver('zip', {
    zlib: { level: 9 },
  }).on('error', err => {
    throw err;
  });
  const output = fs.createWriteStream(`${projectDir}/dist.zip`).on('close', err => {
    if (err) {
      console.log('  关闭archiver异常:', err);
      return;
    }
    successLog('  zip打包成功');
    console.log(`（3）连接${underlineLog(host)}`);
    uploadFile(config);
  });
  archive.pipe(output);
  archive.directory(distPath, '/');
  archive.finalize();
}

// 上传文件
function uploadFile(config) {
  const { host, port, username, password, privateKey, passphrase, } = config;
  const sshConfig = {
    host,
    port,
    username,
    password,
    privateKey,
    passphrase
  };
  ssh.connect(sshConfig)
    .then(() => {
      successLog(`  SSH连接成功`);
      console.log(`（4）上传zip至目录${underlineLog(config.webDir)}`);
      ssh.putFile(`${projectDir}/dist.zip`, `${config.webDir}/dist.zip`)
        .then(() => {
          successLog(`  zip包上传成功`);
          console.log('（5）解压zip包');
          statrRemoteShell(config);
        })
        .catch(err => {
          errorLog('  文件传输异常', err);
          process.exit(0);
        });
    })
    .catch(err => {
      errorLog('  连接失败', err);
      process.exit(0);
    });
}

// 执行Linux命令
function runCommand(command, webDir) {
  return new Promise((resolve, reject) => {
    ssh.execCommand(command, { cwd: webDir })
      .then(result => {
        resolve();
        // if (result.stdout) {
        //   successLog(result.stdout);
        // }
        if (result.stderr) {
          errorLog(result.stderr);
          process.exit(1);
        }
      })
      .catch(err => {
        reject(err);
      });
  });
}

// 开始执行远程命令
function statrRemoteShell(config) {
  const { webDir } = config;
  const commands = [`cd ${webDir}`, 'pwd', 'unzip -o dist.zip && rm -f dist.zip'];
  const promises = [];
  for (let i = 0; i < commands.length; i += 1) {
    promises.push(runCommand(commands[i], webDir));
  }
  Promise.all(promises)
    .then(() => {
      successLog('  解压成功');
      console.log('（6）开始删除本地dist.zip');
      deleteLocalZip(config);
    })
    .catch(err => {
      errorLog('  文件解压失败', err);
      process.exit(0);
    });
}

// 删除本地dist.zip包
function deleteLocalZip(config) {
  const { projectName, name } = config;
  fs.unlink(`${projectDir}/dist.zip`, err => {
    if (err) {
      errorLog('  本地dist.zip删除失败', err);
    }
    successLog('  本地dist.zip删除成功\n');
    successLog(`\n 恭喜您，${underlineLog(projectName)}项目${underlineLog(name)}部署成功了^_^\n`);
    process.exit(0);
  });
}

module.exports = deploy;