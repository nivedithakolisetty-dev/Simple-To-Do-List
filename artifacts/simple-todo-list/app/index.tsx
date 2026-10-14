import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

type TaskFilter = 'all' | 'active' | 'completed';
type LoadState = 'loading' | 'ready' | 'error';
type AppColors = ReturnType<typeof useColors>;

const STORAGE_KEY = 'simple-todo-list.tasks.v1';

function isTaskList(value: unknown): value is Task[] {
  return (
    Array.isArray(value) &&
    value.every(
      (task) =>
        typeof task === 'object' &&
        task !== null &&
        typeof task.id === 'string' &&
        typeof task.title === 'string' &&
        typeof task.completed === 'boolean',
    )
  );
}

function TaskRow({
  task,
  colors,
  onToggle,
  onDelete,
}: {
  task: Task;
  colors: AppColors;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View
      style={[
        styles.taskRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={`${task.completed ? 'Mark as not done' : 'Complete'}: ${task.title}`}
        onPress={onToggle}
        testID={`toggle-task-${task.id}`}
        style={({ pressed }) => [
          styles.checkButton,
          {
            backgroundColor: task.completed ? colors.primary : 'transparent',
            borderColor: task.completed ? colors.primary : colors.input,
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        {task.completed ? (
          <Feather name="check" size={15} color={colors.primaryForeground} />
        ) : null}
      </Pressable>

      <Text
        style={[
          styles.taskTitle,
          { color: task.completed ? colors.mutedForeground : colors.foreground },
          task.completed && styles.completedTaskTitle,
        ]}
      >
        {task.title}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${task.title}`}
        onPress={onDelete}
        testID={`delete-task-${task.id}`}
        hitSlop={10}
        style={({ pressed }) => [
          styles.deleteButton,
          { opacity: pressed ? 0.55 : 1 },
        ]}
      >
        <Feather name="trash-2" size={17} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function FilterButton({
  label,
  count,
  selected,
  colors,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  colors: AppColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        {
          backgroundColor: selected ? colors.primary : 'transparent',
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.filterLabel,
          { color: selected ? colors.primaryForeground : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.filterCount,
          {
            color: selected
              ? colors.primaryForeground
              : colors.mutedForeground,
            opacity: selected ? 0.8 : 0.72,
          },
        ]}
      >
        {count}
      </Text>
    </Pressable>
  );
}

export default function TodoScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveError, setSaveError] = useState(false);
  const tasksRef = useRef<Task[]>([]);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  const loadTasks = useCallback(async () => {
    setLoadState('loading');
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: unknown = stored === null ? [] : JSON.parse(stored);
      if (!isTaskList(parsed)) {
        throw new Error('Saved tasks have an unexpected format.');
      }
      tasksRef.current = parsed;
      setTasks(parsed);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const enqueueSave = (nextTasks: Task[]) => {
    writeQueueRef.current = writeQueueRef.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks)))
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true));
  };

  const commitTasks = (nextTasks: Task[]) => {
    tasksRef.current = nextTasks;
    setTasks(nextTasks);
    setSaveError(false);
    enqueueSave(nextTasks);
  };

  const retrySave = () => {
    setSaveError(false);
    enqueueSave(tasksRef.current);
  };

  const addTask = () => {
    const title = inputText.trim();
    if (!title || loadState !== 'ready') return;

    const task: Task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      completed: false,
    };
    commitTasks([...tasksRef.current, task]);
    setInputText('');
    Keyboard.dismiss();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleTask = (taskId: string) => {
    const nextTasks = tasksRef.current.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task,
    );
    commitTasks(nextTasks);
    void Haptics.selectionAsync();
  };

  const deleteTask = (taskId: string) => {
    commitTasks(tasksRef.current.filter((task) => task.id !== taskId));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const progress = tasks.length === 0 ? 0 : completedCount / tasks.length;
  const visibleTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topInset + 14, paddingBottom: bottomInset + 22 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topLine}>
            <View style={styles.brand}>
              <View
                style={[
                  styles.brandMark,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Feather name="check" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.brandName, { color: colors.foreground }]}>
                DAYLIST
              </Text>
            </View>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
              {dateLabel}
            </Text>
          </View>

          <View style={styles.headingBlock}>
            <Text style={[styles.heading, { color: colors.foreground }]}>
              Your day,{'\n'}your pace.
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.mutedForeground }]}
            >
              A little progress, one task at a time.
            </Text>
          </View>

          <View
            style={[
              styles.progressCard,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius + 8,
              },
            ]}
          >
            <View style={styles.progressTopLine}>
              <View>
                <Text
                  style={[
                    styles.progressEyebrow,
                    { color: colors.primaryForeground, opacity: 0.76 },
                  ]}
                >
                  TODAY&apos;S PROGRESS
                </Text>
                <Text
                  style={[
                    styles.progressValue,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {completedCount}
                  <Text
                    style={[
                      styles.progressTotal,
                      { color: colors.primaryForeground, opacity: 0.68 },
                    ]}
                  >
                    {' '}
                    / {tasks.length} done
                  </Text>
                </Text>
              </View>
              <View
                style={[
                  styles.progressIcon,
                  { borderColor: colors.primaryForeground },
                ]}
              >
                <Feather
                  name={tasks.length > 0 && activeCount === 0 ? 'check' : 'sun'}
                  size={19}
                  color={colors.primaryForeground}
                />
              </View>
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: colors.primaryForeground, opacity: 0.24 },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress * 100}%` as `${number}%`,
                    backgroundColor: colors.primaryForeground,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="New task"
              editable={loadState === 'ready'}
              onChangeText={setInputText}
              onSubmitEditing={addTask}
              placeholder="What needs to get done?"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              maxLength={120}
              value={inputText}
              testID="new-task-input"
              style={[
                styles.taskInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  color: colors.foreground,
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add task"
              accessibilityState={{
                disabled: !inputText.trim() || loadState !== 'ready',
              }}
              disabled={!inputText.trim() || loadState !== 'ready'}
              onPress={addTask}
              testID="add-task-button"
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity:
                    !inputText.trim() || loadState !== 'ready'
                      ? 0.45
                      : pressed
                        ? 0.78
                        : 1,
                },
              ]}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
              <Text
                style={[
                  styles.addButtonLabel,
                  { color: colors.primaryForeground },
                ]}
              >
                Add
              </Text>
            </Pressable>
          </View>

          {saveError ? (
            <View style={styles.saveMessage}>
              <Text style={[styles.saveError, { color: colors.destructive }]}>
                This change could not be saved.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={retrySave}
                hitSlop={8}
              >
                <Text style={[styles.retryLabel, { color: colors.primary }]}>
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.listHeading}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Your list
            </Text>
            <Text
              style={[styles.remainingLabel, { color: colors.mutedForeground }]}
            >
              {activeCount} left
            </Text>
          </View>

          <View style={styles.filters}>
            <FilterButton
              label="All"
              count={tasks.length}
              selected={filter === 'all'}
              colors={colors}
              onPress={() => setFilter('all')}
            />
            <FilterButton
              label="To do"
              count={activeCount}
              selected={filter === 'active'}
              colors={colors}
              onPress={() => setFilter('active')}
            />
            <FilterButton
              label="Done"
              count={completedCount}
              selected={filter === 'completed'}
              colors={colors}
              onPress={() => setFilter('completed')}
            />
          </View>

          {loadState === 'loading' ? (
            <View style={styles.messageState}>
              <ActivityIndicator color={colors.primary} />
              <Text
                style={[styles.messageText, { color: colors.mutedForeground }]}
              >
                Loading your list…
              </Text>
            </View>
          ) : loadState === 'error' ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Feather name="alert-circle" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Your list couldn&apos;t load
              </Text>
              <Text
                style={[styles.emptyHint, { color: colors.mutedForeground }]}
              >
                Check your device storage and try again.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadTasks()}
                style={({ pressed }) => [
                  styles.retryButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.retryButtonLabel,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : visibleTasks.length > 0 ? (
            <View style={styles.taskList}>
              {visibleTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  colors={colors}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Feather
                  name={tasks.length === 0 ? 'check-square' : 'coffee'}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {tasks.length === 0
                  ? 'A little breathing room'
                  : filter === 'active'
                    ? 'You’re all caught up'
                    : 'No completed tasks yet'}
              </Text>
              <Text
                style={[styles.emptyHint, { color: colors.mutedForeground }]}
              >
                {tasks.length === 0
                  ? 'Add a task above and it’ll show up here.'
                  : filter === 'active'
                    ? 'Enjoy the clear space on your list.'
                    : 'Finished tasks will be collected here.'}
              </Text>
            </View>
          )}

          <Text style={[styles.privacyNote, { color: colors.mutedForeground }]}>
            Your tasks stay on this device.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 1.8,
  },
  dateLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  headingBlock: {
    marginTop: 31,
    marginBottom: 23,
  },
  heading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    letterSpacing: -1.25,
    lineHeight: 41,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 10,
  },
  progressCard: {
    paddingHorizontal: 19,
    paddingVertical: 17,
    marginBottom: 19,
  },
  progressTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  progressEyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  progressValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 23,
    letterSpacing: -0.4,
  },
  progressTotal: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    letterSpacing: 0,
  },
  progressIcon: {
    width: 39,
    height: 39,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  composer: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 25,
  },
  taskInput: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  addButton: {
    minWidth: 80,
    minHeight: 54,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  addButtonLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  saveMessage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -17,
    marginBottom: 19,
  },
  saveError: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  retryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    letterSpacing: -0.35,
  },
  remainingLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  filterButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  filterLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  filterCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  taskList: {
    gap: 9,
  },
  taskRow: {
    minHeight: 62,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkButton: {
    width: 23,
    height: 23,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
  },
  deleteButton: {
    width: 30,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageState: {
    minHeight: 128,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  messageText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  emptyState: {
    minHeight: 176,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    marginBottom: 5,
  },
  emptyHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 42,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  retryButtonLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  privacyNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 23,
  },
});
