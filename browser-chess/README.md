# 极简国际象棋

一个无需构建步骤的浏览器国际象棋小游戏，采用原生 HTML/CSS/JavaScript 编写，可直接部署为静态站点并在线试玩。

## 在线试玩 / 部署

本项目是纯静态页面，站点文件集中在 `browser-chess/` 目录，推送到 GitHub 后可直接通过 GitHub Pages 发布：

1. 打开仓库的 **Settings → Pages**。
2. 在 **Build and deployment** 中选择 **GitHub Actions**。
3. 推送 `main` 分支后，工作流会发布站点。
4. 发布完成后，即可通过 GitHub Pages 地址在浏览器和手机上试玩。

线上试玩地址（GitHub Pages）：`https://<GitHub 用户名或组织名>.github.io/refactored-umbrella/`

> 如果仓库名或 Pages 配置不同，请把上方地址中的 `refactored-umbrella` 替换为实际仓库名。

也可以部署到任意静态托管平台，例如 Netlify、Vercel、Cloudflare Pages 或 Nginx，只需要托管 `browser-chess/` 目录。

## 本地试玩

```bash
cd browser-chess
npm start
```

然后在浏览器中打开：

```text
http://127.0.0.1:4173/
```

## 检查

```bash
cd browser-chess
npm run check
npm test
```

## 功能

- 双人同屏对弈，点击棋子后点击目标格落子。
- 合法走法、吃子、上一手和被将军状态高亮。
- 支持将军、将死、逼和判断。
- 支持王车易位、吃过路兵，以及兵升变为后、车、象、马。
- 支持翻转棋盘、悔棋、棋谱、吃子统计，以及移动/吃子音效开关。
- 响应式布局，适配手机竖屏、平板和桌面浏览器。
