# Shell、文件与权限

## 一、是什么

Shell 把人输入的命令解析成程序调用，并通过参数、环境变量、输入输出和退出码连接工具。

## 二、为什么需要

服务开发、部署和排错常依赖远程命令行。理解路径、权限、管道和错误输出，能避免盲目复制命令，也能快速组合小工具。

## 三、核心用法

~~~bash
pwd
ls -la
find . -name '*.log' -type f
grep -n 'ERROR' app.log
tail -n 100 app.log
~~~

重定向与管道：

~~~bash
command >out.txt 2>err.txt
command_a | command_b
~~~

- 标准输出是 fd 1，标准错误是 fd 2。
- <code>&gt;</code> 覆盖文件，<code>&gt;&gt;</code> 追加；执行前确认路径和输出目标。
- 用引号保护包含空格或 glob 字符的参数。

## 四、核心原理

- 命令由程序名和 argv 参数组成；Shell 会先处理引号、变量和通配符，再启动程序。
- 管道把前一个程序的 stdout 接到下一个程序的 stdin。
- 退出码 0 通常表示成功，非 0 表示失败；脚本应检查关键命令结果。
- Linux 权限至少区分 owner、group 和 other 的读、写、执行；目录的执行位表示可遍历。

## 五、常见场景

- 查看配置和日志：less、grep、tail。
- 找文件：find，限定目录、类型和文件名。
- 处理组合任务：管道、重定向和小型脚本。
- 执行服务程序：先检查文件位置、可执行权限和运行用户。

## 六、踩坑点

- 对未知目录直接使用递归删除或覆盖命令。
- 忘记引号，导致带空格路径被拆成多个参数。
- 只看 stdout，忽略 stderr 和非零退出码。
- 把 chmod 777 当作修复权限问题的通用办法。
- 用 sudo 运行所有命令，扩大误操作影响范围。

## 七、项目中的实际使用

先用只读命令确认当前目录、文件和目标；再做最小权限修改。线上排错先查看，不要随手重启、删除或改权限。部署程序时明确运行用户、工作目录、配置文件与可执行权限。

## 八、一句话总结

**Shell 是小程序的组合器，先看清参数、输出和退出码，再执行有副作用的操作。**

## 九、核心问答

### 1. 管道默认传递什么？

前一个命令的标准输出作为后一个命令的标准输入。

### 2. 为什么要区分 stdout 和 stderr？

正常结果与诊断信息可分别显示、保存和处理。

### 3. 目录权限中的 x 表示什么？

允许遍历目录并访问已知文件路径，不等同于“执行目录里的所有文件”。

### 4. 为什么不建议 chmod 777？

它把读写执行权限开放给所有用户，可能造成数据篡改或执行风险。

## 十、自测与答案

1. 怎样把命令正常输出和错误输出分别保存？
2. <code>&gt;</code> 与 <code>&gt;&gt;</code> 有什么区别？
3. 一个脚本命令返回非零时，为什么不能只看屏幕是否有输出？
4. 排错前如何降低递归命令误伤文件的风险？

<details>
<summary>参考答案</summary>

1. 使用 <code>command &gt;out.txt 2&gt;err.txt</code>。
2. <code>&gt;</code> 覆盖目标文件；<code>&gt;&gt;</code> 在文件末尾追加。
3. 失败信息可能仅在 stderr 或退出码中，且空输出不代表成功。
4. 先用 pwd、ls、find 检查目标，再限定操作路径和文件类型。

</details>

## 资料

- [MIT Missing Semester：Shell](https://missing.csail.mit.edu/2026/course-shell/)
- [Linux Upskill Challenge](https://github.com/livialima/linuxupskillchallenge)
- 系统命令选项以本机 <code>man &lt;命令&gt;</code> 为准。
