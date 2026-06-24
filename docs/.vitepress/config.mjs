import { defineConfig } from 'vitepress'

const nav = [
  { text: '首页', link: '/' },
  { text: 'Java', link: '/java/' },
  { text: 'Golang', link: '/golang/' },
  { text: '构建', link: '/building/' },
  { text: 'AI', link: '/ai/' },
  { text: 'Apple', link: '/apple/' },
  { text: '踩坑', link: '/bug/' },
  { text: 'Bug地狱', link: '/bughell/' },
  { text: 'CheatSheet', link: '/cheat-sheet/' },
  { text: '随笔', link: '/eaasy/' },
]

export default defineConfig({
  lang: 'zh-CN',
  title: 'gclhaha的博客',
  description: '记录 Java、Go、AI、构建与日常思考。',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    config: (md) => {
      md.core.ruler.push('map-ldif-code-blocks', (state) => {
        for (const token of state.tokens) {
          if (token.type !== 'fence') continue
          const [lang, ...rest] = token.info.trim().split(/\s+/)
          if (lang !== 'ldif') continue
          token.info = ['txt', ...rest].join(' ').trim()
        }
      })
    },
  },
  head: [
    [
      'script',
      {
        async: '',
        src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6298430787430832',
        crossorigin: 'anonymous',
      },
    ],
  ],
  themeConfig: {
    nav,
    socialLinks: [{ icon: 'github', link: 'https://github.com/gclhaha/blog' }],
    search: {
      provider: 'local',
    },
    outline: {
      level: [2, 3],
      label: '页面导航',
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
    lastUpdated: {
      text: '最后更新',
    },
  },
})
