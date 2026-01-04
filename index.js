/**
 * @format
 */

// Polyfill for crypto.getRandomValues() - required by uuid
import 'react-native-get-random-values';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerNotificationListeners } from './src/services/notificationService';

// Ensure notification listeners are registered for foreground/background delivery events
registerNotificationListeners();

AppRegistry.registerComponent(appName, () => App);
