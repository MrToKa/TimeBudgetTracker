# Time Budget Tracker

A React Native mobile application for tracking time spent on various activities with support for goals, routines, and parallel timers.

## Features

- ⏱️ **Parallel Timers**: Run multiple activity timers simultaneously
- 📊 **Dashboard**: Visual analytics of your time usage
- 🎯 **Goals**: Set minimum or maximum time goals (daily, weekly, monthly)
- 🔄 **Routines**: Create and execute activity templates
- 📱 **Offline-first**: Works without internet connection
- 🌙 **Dark Mode**: Built-in theme support
- 📈 **Review**: Analyze your daily time allocations
- ⭐ **Favorites**: Quick access to frequently used activities

## Prerequisites

> **Note**: Make sure you have completed the [React Native Environment Setup](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

### Required Tools

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Android Studio** (for Android builds)
- **JDK 17** (for Android builds)
- **Xcode** (for iOS builds, macOS only)
- **Ruby** and **CocoaPods** (for iOS builds)

# Getting Started

## Installation

1. **Clone the repository** (if not already done):
   ```sh
   git clone <repository-url>
   cd TimeBudgetTracker
   ```

2. **Install dependencies**:
   ```sh
   npm install
   # OR
   yarn install
   ```

3. **For iOS** (macOS only), install CocoaPods dependencies:
   ```sh
   cd ios
   bundle install
   bundle exec pod install
   cd ..
   ```

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Building for Production

### Android Release APK

To build a release APK for Android that can be installed on devices:

1. **Navigate to the android directory**:
   ```sh
   cd android
   ```

2. **Build the release APK**:
   ```sh
   # On Windows (PowerShell)
   .\gradlew.bat assembleRelease

   # On macOS/Linux
   ./gradlew assembleRelease
   ```

3. **Locate the APK**:
   
   The APK will be generated at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

4. **Install on device**:
   - Transfer the APK to your Android device
   - Enable "Install from Unknown Sources" in device settings
   - Open the APK file to install

### Android App Bundle (AAB)

For Google Play Store distribution:

```sh
cd android
.\gradlew.bat bundleRelease  # Windows
./gradlew bundleRelease      # macOS/Linux
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

### iOS Release Build

1. **Open the project in Xcode**:
   ```sh
   open ios/TimeBudgetTracker.xcworkspace
   ```

2. **Configure signing**:
   - Select the project in Xcode
   - Go to "Signing & Capabilities"
   - Select your team and configure signing certificates

3. **Archive the app**:
   - Select "Any iOS Device" as the build target
   - Go to Product > Archive
   - Once complete, use the Organizer to distribute

### Cleaning Build Cache

If you encounter build issues, try cleaning the build cache:

**Android:**
```sh
cd android
.\gradlew.bat clean  # Windows
./gradlew clean      # macOS/Linux
cd ..
```

**iOS:**
```sh
cd ios
rm -rf Pods Podfile.lock
bundle exec pod install
cd ..
```

**React Native:**
```sh
# Clean Metro bundler cache
npm start -- --reset-cache

# Clean node_modules (if needed)
rm -rf node_modules
npm install
```

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

## Common Issues

### Android Build Issues

**Gradle build fails:**
- Ensure you have JDK 17 installed
- Clean the build cache: `cd android && .\gradlew.bat clean`
- Check `JAVA_HOME` environment variable

**Module resolution errors:**
- Clear Metro cache: `npm start -- --reset-cache`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Device not detected:**
- Enable USB debugging on Android device
- Run `adb devices` to verify connection
- Try `adb kill-server && adb start-server`

### iOS Build Issues

**Pod install fails:**
- Update CocoaPods: `bundle exec pod repo update`
- Try: `cd ios && rm -rf Pods Podfile.lock && bundle exec pod install`

**Code signing errors:**
- Configure your team in Xcode signing settings
- Ensure valid provisioning profiles

### General Issues

**App crashes on startup:**
- Check native dependencies are properly linked
- Verify SQLite and other native modules are installed
- Clean and rebuild the app

**Hot reload not working:**
- Restart Metro bundler
- Ensure device/emulator is on the same network (for physical devices)

For more issues, see the [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

## Project Structure

```
TimeBudgetTracker/
├── src/
│   ├── components/      # Reusable UI components
│   ├── constants/       # App constants and categories
│   ├── contexts/        # React contexts (Theme)
│   ├── database/        # SQLite database setup and repositories
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # App screens
│   ├── services/        # Background services (notifications)
│   ├── store/           # Zustand state management
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── android/             # Android native code
├── ios/                 # iOS native code
└── __tests__/           # Test files
```

## Technologies Used

- **React Native 0.83** - Mobile framework
- **TypeScript** - Type safety
- **React Navigation** - Navigation
- **Zustand** - State management
- **SQLite** - Local database
- **Notifee** - Local notifications
- **React Native Chart Kit** - Data visualization
- **date-fns** - Date utilities

# Troubleshooting

If you're having issues getting the above steps to work, see the troubleshooting section above or the [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

## Known issues

IMPORTANT: This app was tested only on Samsung Galaxy S24 Ultra. It might not work properly on other devices. Feel free to adapt the app to your device specifications.

In landscape mode the software buttons are overlapping the side of the app and the part below the buttons is not visible.