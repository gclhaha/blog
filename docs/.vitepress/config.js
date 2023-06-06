export default {
    // site-level options
    title: 'gclhaha的博客',
    description: '分享知识，无限进步',
  
    themeConfig: {
      sidebar: {
        '/building/': [
          { text: '指南', children: ['/building/README.md', '/building/vercel.md'] },
        ],
        '/about/': [
          { text: '关于', children: ['/about/README.md'] },
        ],
      },
    }
  }