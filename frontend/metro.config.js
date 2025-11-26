const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// แก้ปัญหา timeout และเพิ่มความเร็ว
config.server = {
  ...config.server,
  port: 8081,
};

// เพิ่มความเร็วในการ bundle
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      drop_console: false,
    },
  },
};

// ลด cache problems
config.resetCache = true;

module.exports = config;
