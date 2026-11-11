# 更新摄影集

网页读取 `src/data/albums.json`。每个系列包含照片清单，不需要逐页改代码。`demo: true` 用来标识示例照片；导入自己的作品默认是 `false`。

## 本机照片目录

把原片放在仓库旁边的目录，例如：

```text
Codex_Download/
├── xtnie.github.io/          # 网站仓库
└── photography-originals/   # 本机原片，不在网站仓库内
    └── weekend/
        ├── seaside.jpg
        └── evening.jpg
```

在网站仓库中先预览导入结果：

```sh
npm run photos:import -- --input ../photography-originals/weekend --slug weekend --title 周末散步
```

确认系列名和照片数量后，使用同一条命令加 `--write`：

```sh
npm run photos:import -- --input ../photography-originals/weekend --slug weekend --title 周末散步 --title-en "Weekend walk" --location 上海 --category 街头 --date 2026-11-10 --write
npm run build
```

`--date` 可省略，省略时不会伪造拍摄日期。新系列 `year` 默认导入年份，可用 `--year 2025` 指定。其他可选参数为 `--description`、`--demo`。`--slug` 必须使用小写英文字母、数字和单个连字符，例如 `weekend-walk`；它决定系列网址，后续更新同一系列应复用它。

导入器只读取指定文件夹这一层的图片，不扫描子目录或符号链接。JPEG、PNG、WebP、AVIF、TIFF 可直接导入；HEIC/HEIF 取决于本机 Sharp 的解码支持，解码失败时请先导出为 JPEG。相机 RAW 请先在你的修图软件中导出。继续向同一个系列导入新照片时，会保留已有照片与选定的封面。

导入会自动处理照片方向，生成 800 / 1600 / 2400 像素宽的 WebP；小图不会放大，重复尺寸只生成一份。图片存入 `public/photos/<slug>/`，原片不变，也不会被复制进仓库。WebP 默认去除 EXIF/GPS；要展示相机和镜头信息，可在清单里单独填写 `camera`、`lens`、`settings`。图片 ID 来自原片内容的 SHA-256，重复导入同一张照片不会增加重复记录。

默认不加 `--write` 时，导入器只读文件和元数据，不创建图片、目录或清单。正式导入先验证图片和合并结果，再发布衍生图片并原子更新清单。若最后写清单失败，可能留下未被引用的 WebP，但现有清单保持完整。原片请另外做好备份。

## 清单格式

根节点为数组。一个最小系列：

```json
[
  {
    "slug": "weekend",
    "title": "周末散步",
    "titleEn": "Weekend walk",
    "description": "天黑之前，再走一段。",
    "location": "上海",
    "category": "街头",
    "year": 2026,
    "demo": false,
    "cover": "photo-001",
    "photos": [
      {
        "id": "photo-001",
        "src": "/photos/weekend/photo-001-1600.webp",
        "alt": "傍晚的街角，阳光落在路人的肩上",
        "width": 1600,
        "height": 1067,
        "takenAt": "2026-11-10",
        "camera": "RICOH GR II",
        "lens": "18.3 mm",
        "settings": "f/5.6 · 1/250 s · ISO 400",
        "variants": [
          { "src": "/photos/weekend/photo-001-800.webp", "width": 800, "height": 534 },
          { "src": "/photos/weekend/photo-001-1600.webp", "width": 1600, "height": 1067 }
        ]
      }
    ]
  }
]
```

`takenAt`、`camera`、`lens`、`settings`、`variants` 都可省略。示例照片或需要注明来源的照片可以添加 `credit: { "name": "摄影师姓名", "url": "https://摄影师的作品页" }`。`src` 的宽高必须与对应图片一致，封面 `cover` 必须指向该系列内的照片 ID。

导入外部清单：

```sh
npm run photos:sync -- --input ../albums-export.json
npm run photos:sync -- --input ../albums-export.json --write
```

同步按系列 `slug`、照片 `id` 合并。同 ID 的照片使用新记录，其他照片和其他系列会保留；不会因为输入缺少某项就删除作品。需要删除照片或示例系列时，明确编辑 `src/data/albums.json`，再清理不再使用的图片文件。字段会按此文档的格式规范化，额外的自定义字段不保留。

## R2 与 AfterFrame

目前本机导入与 JSON 同步可以使用；**这不代表已连接 AfterFrame MCP 或已开通 R2**。

有 R2 后，可以把生成的 WebP 上传到你自己的桶，并把 `src` 和每个 `variants[].src` 改成该对象的完整公开 HTTPS 地址，例如 `https://photos.example.com/weekend/photo-001-1600.webp`。使用长期公开的图片域名，不要把账户密钥或临时签名 URL 放进清单。仓库里无需 R2 密钥，访问者只读取公开图片。生产图片建议使用绑定到 R2 的自定义域名；`r2.dev` 是开发用途地址。

AfterFrame 连接可用后，由 Agent 读取你明确选中的照片，整理成上述清单，并先运行默认预览模式；确认实际照片路径或上传后的 R2 地址后再写入。当前同步脚本不会自行连接 AfterFrame、不会扫描系统相册，也不会上传到 R2。将来接入时保留这份规范化清单作为交接点，网页层不用重写。

正式更新流程为：选片 → 本机生成 WebP（或上传到 R2）→ 校验清单 → 构建 → 提交 GitHub。GitHub Pages 和 Cloudflare Pages 都可构建同一份 Astro 静态站。
