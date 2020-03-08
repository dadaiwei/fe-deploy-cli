#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const download = require('download-git-repo');
const ora = require('ora');
const { successLog, infoLog, errorLog, underlineLog } = require('../utils/index');
let tmp = 'deploy';
const deployPath = path.join(process.cwd(), './deploy');
const deployConfigPath = `${deployPath}/deploy.config.js`;
const deployGit = 'dadaiwei/fe-deploy-cli-template';

// 检查部署目录及部署配置文件是否存在
const checkDeployExists = () => {
    if (fs.existsSync(deployPath) && fs.existsSync(deployConfigPath)) {
        infoLog('deploy目录下的deploy.config.js配置文件已经存在，请勿重新下载');
        process.exit(1);
        return;
    }
    downloadAndGenerate(deployGit);
};

// 下载部署脚本配置
const downloadAndGenerate = templateUrl => {
    const spinner = ora('开始生成部署模板');
    spinner.start();
    download(templateUrl, tmp, { clone: false }, err => {
        if (err) {
            console.log();
            errorLog(err);
            process.exit(1);
        }
        spinner.stop();
        successLog('模板下载成功，模板位置：deploy/deploy.config.js');
        infoLog('请配置deploy目录下的deploy.config.js配置文件');
        console.log('注意：请删除不必要的环境配置（如只需线上环境，请删除dev测试环境配置）');
        process.exit(0);
    });
};

module.exports = () => {
    checkDeployExists();
};
