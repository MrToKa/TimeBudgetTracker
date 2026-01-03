import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button } from '../../components/common';
import { BackupData, BackupMetadata } from '../../types';
import { getAllCategories } from '../../database/repositories/categoryRepository';
import { getAllActivities } from '../../database/repositories/activityRepository';
import { getSessionsInRange } from '../../database/repositories/sessionRepository';
import { getAllGoals } from '../../database/repositories/goalRepository';
import { getAllSettings } from '../../database/repositories/settingsRepository';

const APP_VERSION = '1.0.0';
const BACKUP_VERSION = 1;

export default function BackupScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const createBackup = async (): Promise<BackupData> => {
    // Get all data from database
    const categories = await getAllCategories();
    const activities = await getAllActivities();
    
    // Get sessions from last 2 years
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const sessions = await getSessionsInRange(twoYearsAgo, new Date());
    
    const goals = await getAllGoals(false);
    const settings = await getAllSettings();

    const metadata: BackupMetadata = {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      deviceInfo: Platform.OS,
    };

    return {
      metadata,
      categories,
      activities,
      sessions,
      goals,
      routines: [], // Will be populated when routines are implemented
      routineItems: [],
      settings,
    };
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const backupData = await createBackup();
      const jsonString = JSON.stringify(backupData, null, 2);
      
      const fileName = `time-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      // Share the backup data
      await Share.share({
        message: jsonString,
        title: fileName,
      });
      
      setLastBackup(new Date().toISOString());
      Alert.alert('Success', 'Backup created successfully. You can save or share the exported data.');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to create backup. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Import Data',
      'To import a backup:\n\n1. Open the backup JSON file\n2. Copy its contents\n3. Use "Import from Clipboard"\n\nNote: This will merge with existing data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import from Clipboard', onPress: importFromClipboard },
      ]
    );
  };

  const importFromClipboard = async () => {
    setImporting(true);
    try {
      // In a real implementation, we would use Clipboard API
      // and then parse and import the data
      Alert.alert(
        'Coming Soon',
        'Full import functionality will be available in the next update. The backup JSON structure is ready for future restoration.'
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import backup. Please check the data format.');
    } finally {
      setImporting(false);
    }
  };

  const renderStats = () => (
    <Card style={styles.statsCard}>
      <Text style={styles.sectionTitle}>Data Overview</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Icon name="folder" size={24} color={theme.primary} />
          <Text style={styles.statLabel}>Categories</Text>
          <Text style={styles.statValue}>-</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="format-list-bulleted" size={24} color={theme.success} />
          <Text style={styles.statLabel}>Activities</Text>
          <Text style={styles.statValue}>-</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="clock" size={24} color={theme.secondary} />
          <Text style={styles.statLabel}>Sessions</Text>
          <Text style={styles.statValue}>-</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="flag" size={24} color={theme.warning} />
          <Text style={styles.statLabel}>Goals</Text>
          <Text style={styles.statValue}>-</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Backup & Restore</Text>
      <Text style={styles.subtitle}>
        Export your data to keep a safe copy, or import from a previous backup.
      </Text>

      {renderStats()}

      <Card style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <View style={[styles.actionIcon, { backgroundColor: theme.success + '15' }]}>
            <Icon name="cloud-upload" size={28} color={theme.success} />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Export Backup</Text>
            <Text style={styles.actionSubtitle}>
              Create a JSON file with all your data
            </Text>
          </View>
        </View>
        <Button
          title={exporting ? 'Creating Backup...' : 'Export Data'}
          onPress={handleExport}
          disabled={exporting}
          style={styles.actionButton}
        />
        {lastBackup && (
          <Text style={styles.lastBackup}>
            Last backup: {new Date(lastBackup).toLocaleString()}
          </Text>
        )}
      </Card>

      <Card style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <View style={[styles.actionIcon, { backgroundColor: theme.primary + '15' }]}>
            <Icon name="cloud-download" size={28} color={theme.primary} />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Import Backup</Text>
            <Text style={styles.actionSubtitle}>
              Restore data from a previous export
            </Text>
          </View>
        </View>
        <Button
          title={importing ? 'Importing...' : 'Import Data'}
          onPress={handleImport}
          disabled={importing}
          variant="outline"
          style={styles.actionButton}
        />
      </Card>

      <Card style={styles.infoCard}>
        <Icon name="information" size={20} color={theme.info} />
        <Text style={styles.infoText}>
          Backups include categories, activities, time sessions, goals, and settings.
          Data is exported as a JSON file that you can save to cloud storage or share.
        </Text>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Backup format version: {BACKUP_VERSION}</Text>
        <Text style={styles.footerText}>App version: {APP_VERSION}</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 16,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    marginTop: 2,
  },
  actionCard: {
    marginBottom: 16,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  actionSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  actionButton: {
    marginTop: 0,
  },
  lastBackup: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.info + '10',
    borderWidth: 1,
    borderColor: theme.info + '30',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: theme.textTertiary,
    marginTop: 4,
  },
});
