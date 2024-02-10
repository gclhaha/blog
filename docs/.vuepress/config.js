import { defineUserConfig } from 'vuepress'
import { inject } from '@vercel/analytics';
inject();

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'gclhahah的博客',
  head: [
    [
      "script",
      {
        async: true,
        src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6298430787430832",
        crossorigin: "anonymous"
      }
    ]
  ]
})