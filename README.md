# Sutton · 光影与日常

Astro 静态摄影集与个人博客。采用简洁的顶部导航、系统字体与黑白配色，照片按原始比例展示。

- 摄影系列、类别筛选、近期照片、键盘/触屏灯箱、明暗主题与响应式布局。
- 原 `content/` Markdown 文章保留并展示在「文字」中；旧路由有迁移入口。
- 样片明确标记，并附摄影师与来源，详见 `public/photos/demo/CREDITS.txt`。

## 本地运行

Node 22.19+、pnpm 10.11：

```sh
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm build
```

## 添加照片

原片放在博客目录旁的 `../photography-originals/`，每个系列一个文件夹。原片不会提交或上传。

```sh
pnpm photos:import --input ../photography-originals/weekend --slug weekend --title 周末散步
# 检查 dry-run 后写入：
pnpm photos:import --input ../photography-originals/weekend --slug weekend --title 周末散步 --write
pnpm build
```

自动生成 WebP 尺寸并更新 `src/data/albums.json`。编辑清单可修改标题、说明、地点、封面，手动删除示例系列即可移除样片。详见 [照片工作流](docs/PHOTOS.md)。

## 部署

GitHub Pages 默认地址：`https://xtnie.github.io/bebopoy.github.io/`。仓库 Settings → Pages → Source 设为 **GitHub Actions**。推送 `master` 后检查、构建并发布；PR 只检查，不部署。锁文件固定依赖。

Cloudflare Pages 也可导入此仓库，构建命令 `pnpm build`，输出 `dist`，环境变量 `SITE_BASE=/`、`SITE_URL=https://你的域名`。无需服务端适配器。

图片 `src` 可直接使用 R2 自定义域名的 HTTPS URL，清单无需改动前端。当前交付使用仓库内的优化图片，未创建 Cloudflare/R2 资源，未连接 AfterFrame MCP；不要把访问密钥放进客户端或 Git。AfterFrame 以后可输出标准 JSON，再由 `photos:sync` 验证并合并。

旧 Nuxt 源码仍留在仓库用于回溯；当前构建只读取 `src/` 和保留的 `content/`。历史版本还可通过 Git 恢复。
