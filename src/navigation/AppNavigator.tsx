// Navigation Setup

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { RootStackParamList, MainTabParamList } from '../types';
import Colors from '../constants/colors';

// Screens
import HomeScreen from '../screens/Home/HomeScreen';
import ReviewScreen from '../screens/Review/ReviewScreen';
import ActivitiesScreen from '../screens/Activities/ActivitiesScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import MoreScreen from '../screens/More/MoreScreen';
import ManualAddScreen from '../screens/ManualAdd/ManualAddScreen';
import ActivityDetailScreen from '../screens/Activities/ActivityDetailScreen';
import EditActivityScreen from '../screens/Activities/EditActivityScreen';
import GoalsScreen from '../screens/Goals/GoalsScreen';
import CreateGoalScreen from '../screens/Goals/CreateGoalScreen';
import EditGoalScreen from '../screens/Goals/EditGoalScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import BackupScreen from '../screens/Backup/BackupScreen';
import ReviewScreenStack from '../screens/Review/ReviewScreen';
import RoutinesScreen from '../screens/Routines/RoutinesScreen';
import CreateRoutineScreen from '../screens/Routines/CreateRoutineScreen';
import RoutineDetailScreen from '../screens/Routines/RoutineDetailScreen';
import AddRoutineActivityScreen from '../screens/Routines/AddRoutineActivityScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = (() => {
            switch (route.name) {
              case 'Home':
                return focused ? 'home-variant' : 'home-variant-outline';
              case 'Review':
                return focused ? 'calendar-check' : 'calendar-check-outline';
              case 'Activities':
                return focused ? 'format-list-bulleted-square' : 'format-list-bulleted';
              case 'Dashboard':
                return focused ? 'view-dashboard' : 'view-dashboard-outline';
              case 'More':
                return 'dots-horizontal';
              default:
                return 'checkbox-blank-circle-outline';
            }
          })();

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Review" 
        component={ReviewScreen}
        options={{ title: 'Review' }}
      />
      <Tab.Screen 
        name="Activities" 
        component={ActivitiesScreen}
        options={{ title: 'Activities' }}
      />
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreScreen}
        options={{ title: 'More' }}
      />
    </Tab.Navigator>
  );
}

// Root Stack Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: Colors.white,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitleVisible: false,
          headerBackImage: () => (
            <Icon name="arrow-left" size={24} color={Colors.white} style={{ marginLeft: 10 }} />
          ),
        }}
      >
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ManualAdd" 
          component={ManualAddScreen}
          options={{ title: 'Add Time Entry' }}
        />
        <Stack.Screen 
          name="ActivityDetail" 
          component={ActivityDetailScreen}
          options={{ title: 'Activity Details' }}
        />
        <Stack.Screen 
          name="EditActivity" 
          component={EditActivityScreen}
          options={({ route }) => ({ 
            title: route.params?.activityId ? 'Edit Activity' : 'New Activity' 
          })}
        />
        <Stack.Screen 
          name="Goals" 
          component={GoalsScreen}
          options={{ title: 'Goals' }}
        />
        <Stack.Screen 
          name="CreateGoal" 
          component={CreateGoalScreen}
          options={{ title: 'Create Goal' }}
        />
        <Stack.Screen 
          name="EditGoal" 
          component={EditGoalScreen}
          options={{ title: 'Edit Goal' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen 
          name="Backup" 
          component={BackupScreen}
          options={{ title: 'Backup & Restore' }}
        />
        <Stack.Screen 
          name="Review" 
          component={ReviewScreenStack}
          options={{ title: 'Review Day' }}
        />
        <Stack.Screen 
          name="Routines" 
          component={RoutinesScreen}
          options={{ title: 'Routines' }}
        />
        <Stack.Screen 
          name="CreateRoutine" 
          component={CreateRoutineScreen}
          options={{ title: 'Create Routine' }}
        />
        <Stack.Screen 
          name="RoutineDetail" 
          component={RoutineDetailScreen}
          options={{ title: 'Edit Routine' }}
        />
        <Stack.Screen 
          name="AddRoutineActivity" 
          component={AddRoutineActivityScreen}
          options={{ title: 'Add Activity' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
