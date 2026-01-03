const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceIcon = path.join(__dirname, '..', 'AppIcon.png');

// iOS icon sizes
const iosIcons = [
  { size: 40, scale: 2, filename: 'icon-20@2x.png' },      // 40x40
  { size: 60, scale: 3, filename: 'icon-20@3x.png' },      // 60x60
  { size: 58, scale: 2, filename: 'icon-29@2x.png' },      // 58x58
  { size: 87, scale: 3, filename: 'icon-29@3x.png' },      // 87x87
  { size: 80, scale: 2, filename: 'icon-40@2x.png' },      // 80x80
  { size: 120, scale: 3, filename: 'icon-40@3x.png' },     // 120x120
  { size: 120, scale: 2, filename: 'icon-60@2x.png' },     // 120x120
  { size: 180, scale: 3, filename: 'icon-60@3x.png' },     // 180x180
  { size: 1024, scale: 1, filename: 'icon-1024.png' }      // 1024x1024
];

// Android icon sizes
const androidIcons = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 }
];

const iosIconPath = path.join(__dirname, 'ios', 'TimeBudgetTracker', 'Images.xcassets', 'AppIcon.appiconset');
const androidResPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

console.log('Checking for source icon:', sourceIcon);
if (!fs.existsSync(sourceIcon)) {
  console.error('Error: AppIcon.png not found at', sourceIcon);
  process.exit(1);
}

// Check if ImageMagick is available
try {
  execSync('magick -version', { stdio: 'pipe' });
  console.log('ImageMagick found, using magick command');
  var useImageMagick = true;
} catch (e) {
  console.log('ImageMagick not found. Attempting to use sharp package...');
  try {
    var sharp = require('sharp');
    var useSharp = true;
  } catch (err) {
    console.error('Neither ImageMagick nor sharp package found.');
    console.error('Please install one of them:');
    console.error('  - ImageMagick: https://imagemagick.org/script/download.php');
    console.error('  - Or run: npm install sharp');
    process.exit(1);
  }
}

// Generate iOS icons
console.log('\nGenerating iOS icons...');
iosIcons.forEach(icon => {
  const outputPath = path.join(iosIconPath, icon.filename);
  console.log(`  Creating ${icon.filename} (${icon.size}x${icon.size})`);
  
  if (useImageMagick) {
    execSync(`magick "${sourceIcon}" -resize ${icon.size}x${icon.size} "${outputPath}"`);
  } else if (useSharp) {
    sharp(sourceIcon)
      .resize(icon.size, icon.size)
      .toFile(outputPath);
  }
});

// Generate Android icons
console.log('\nGenerating Android icons...');
androidIcons.forEach(icon => {
  const folderPath = path.join(androidResPath, icon.folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  const outputPath = path.join(folderPath, 'ic_launcher.png');
  console.log(`  Creating ${icon.folder}/ic_launcher.png (${icon.size}x${icon.size})`);
  
  if (useImageMagick) {
    execSync(`magick "${sourceIcon}" -resize ${icon.size}x${icon.size} "${outputPath}"`);
  } else if (useSharp) {
    sharp(sourceIcon)
      .resize(icon.size, icon.size)
      .toFile(outputPath);
  }
  
  // Also create round icon for Android
  const roundOutputPath = path.join(folderPath, 'ic_launcher_round.png');
  if (useImageMagick) {
    execSync(`magick "${sourceIcon}" -resize ${icon.size}x${icon.size} "${roundOutputPath}"`);
  } else if (useSharp) {
    sharp(sourceIcon)
      .resize(icon.size, icon.size)
      .toFile(roundOutputPath);
  }
});

// Update iOS Contents.json with filenames
console.log('\nUpdating iOS Contents.json...');
const contentsJsonPath = path.join(iosIconPath, 'Contents.json');
const contentsJson = {
  "images": [
    {
      "filename": "icon-20@2x.png",
      "idiom": "iphone",
      "scale": "2x",
      "size": "20x20"
    },
    {
      "filename": "icon-20@3x.png",
      "idiom": "iphone",
      "scale": "3x",
      "size": "20x20"
    },
    {
      "filename": "icon-29@2x.png",
      "idiom": "iphone",
      "scale": "2x",
      "size": "29x29"
    },
    {
      "filename": "icon-29@3x.png",
      "idiom": "iphone",
      "scale": "3x",
      "size": "29x29"
    },
    {
      "filename": "icon-40@2x.png",
      "idiom": "iphone",
      "scale": "2x",
      "size": "40x40"
    },
    {
      "filename": "icon-40@3x.png",
      "idiom": "iphone",
      "scale": "3x",
      "size": "40x40"
    },
    {
      "filename": "icon-60@2x.png",
      "idiom": "iphone",
      "scale": "2x",
      "size": "60x60"
    },
    {
      "filename": "icon-60@3x.png",
      "idiom": "iphone",
      "scale": "3x",
      "size": "60x60"
    },
    {
      "filename": "icon-1024.png",
      "idiom": "ios-marketing",
      "scale": "1x",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
};

fs.writeFileSync(contentsJsonPath, JSON.stringify(contentsJson, null, 2));

console.log('\n✅ All icons generated successfully!');
console.log('\nNext steps:');
console.log('  1. Rebuild your app for iOS and Android');
console.log('  2. For iOS: cd ios && pod install (if needed)');
console.log('  3. For Android: cd android && ./gradlew clean');
console.log('  4. Run your app: npm run android or npm run ios');
