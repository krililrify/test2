# 汇率换算网站（第一版）

纯静态站点：原生 HTML / CSS / JS，数据来自免费的 [Frankfurter API](https://frankfurter.dev/)，无需 API Key、后端、数据库或构建。

## 文件说明
| 文件 | 用途 |
|---|---|
| `index.html` | 页面结构 |
| `style.css` | 样式（响应式、自动适配深色模式） |
| `app.js` | 货币列表（`CURRENCIES`，增加货币加一行即可）、换算、缓存、API 请求 |
| `README.md` | 本说明 |

## 1. 本地运行与测试
直接双击 `index.html` 即可打开。若浏览器拦截请求，改用本地服务器：
```bash
cd currency-converter
python3 -m http.server 8000
```
然后访问 http://localhost:8000 。

## 2. 检查 API 是否正常
浏览器打开下面的地址，应看到包含 `date`、`quote`、`rate` 的 JSON：
```
https://api.frankfurter.dev/v2/rates?base=USD&quotes=CNY,JPY,EUR
```
或命令行：`curl "https://api.frankfurter.dev/v2/rates?base=USD&quotes=CNY,JPY,EUR"`

**注意**：Frankfurter 数据主要来自各国央行/官方机构，并非所有货币都有。若 API 没有返回某种货币（例如 ARS、VND、PKR、BDT、SAR、TWD、RUB 中的某些），页面会如实显示“暂无数据”并禁用该行，不会伪造汇率。请以实际部署后页面顶部的提示为准。

## 3. 上传到 GitHub
```bash
cd currency-converter
git init
git add .
git commit -m "init currency converter"
git branch -M main
git remote add origin https://github.com/你的用户名/currency-converter.git
git push -u origin main
```
（需先在 GitHub 网页上新建空仓库 `currency-converter`。）

## 4. 连接 Cloudflare Pages
1. 登录 Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 授权 GitHub，选择 `currency-converter` 仓库 → **Begin setup**。
3. 按下表填写，点击 **Save and Deploy**。

## 5. 构建配置（纯静态）
| 项目 | 填写 |
|---|---|
| Framework preset | `None` |
| Build command | 留空（或不填） |
| Build output directory | `/`（根目录；如界面不接受，填 `.`） |
| Root directory | 留空（若文件放在子目录，填该子目录名） |

部署成功后得到 `https://项目名.pages.dev`。之后每次 `git push` 都会自动重新部署。

## 6. 部署后测试清单
- 25 种货币全部出现在列表中（API 未返回的会显示“暂无数据”）。
- 修改任意一行金额，其他行同步变化；输入 `0.`、清空输入框时界面不应异常。
- 方向检查：若 1 USD = 7 CNY，则输入 100 CNY，USD 应约为 14.2857，而不是 700。
- 搜索 `USD`、`日元` 能过滤；点击 ⇄ 能互换目标/对比货币。
- 页面显示的“数据日期”应与 API 返回的 `date` 一致。
- 断网后点击“刷新汇率”：应提示失败，并显示缓存数据及“来自缓存”警告；首次访问且断网时只显示错误。
- 用手机或浏览器开发者工具的设备模式检查布局。

## 7. 查看控制台与排查
按 `F12`（Mac：`Cmd+Option+I`）：
- **Console**：查看 JavaScript 报错。
- **Network**：筛选 `rates`，查看请求状态码（200 正常；429 表示限流；CORS 或 blocked 表示网络/插件拦截）。
- **Application → Local Storage**：查看键 `fx_cache_v1`（缓存的汇率），可手动删除后测试“无缓存”情形。

## 后续计划
第二版可用 Cloudflare Worker 定时拉取并缓存汇率，实现更稳定的每日更新（第一版刻意不包含）。
