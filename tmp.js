// Routine Execution Store - Zustand state management for running routines
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { create } from 'zustand';
import { nowISO, calculateDurationMinutes, calculateDurationSeconds } from '../utils/dateUtils';
import * as sessionRepository from '../database/repositories/sessionRepository';
import { getRoutineWithItems } from '../database/repositories/routineRepository';
import { scheduleTimerWarning, cancelTimerNotifications, showTimerStartNotification, } from '../services/notificationService';
import { useTimerStore } from './timerStore';
import * as settingsRepository from '../database/repositories/settingsRepository';
var getRunStartKey = function (routineId) { return "runningRoutine:".concat(routineId, ":startTime"); };
export var useRoutineExecutionStore = create(function (set, get) { return ({
    runningRoutine: null,
    isLoading: false,
    error: null,
    lastAutoStartedRoutineId: null,
    startRoutine: function (routineId) { return __awaiter(void 0, void 0, void 0, function () {
        var routine, activities, now, firstActivity, session, startDate, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    set({ isLoading: true, error: null });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, , 12]);
                    return [4 /*yield*/, getRoutineWithItems(routineId)];
                case 2:
                    routine = _a.sent();
                    if (!routine) {
                        throw new Error('Routine not found');
                    }
                    if (routine.items.length === 0) {
                        throw new Error('Cannot start routine with no activities');
                    }
                    return [4 /*yield*/, Promise.all(routine.items.map(function (item) { return __awaiter(void 0, void 0, void 0, function () {
                            var categoryRows, category;
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0: return [4 /*yield*/, import('../database').then(function (db) {
                                            return db.executeQuery('SELECT id, name, color FROM categories WHERE id = ?', [item.activity.categoryId]);
                                        })];
                                    case 1:
                                        categoryRows = _c.sent();
                                        category = categoryRows[0];
                                        return [2 /*return*/, {
                                                id: item.id,
                                                activityId: item.activityId,
                                                activityName: item.activity.name,
                                                categoryId: item.activity.categoryId,
                                                categoryName: (_a = category === null || category === void 0 ? void 0 : category.name) !== null && _a !== void 0 ? _a : 'Unknown',
                                                categoryColor: (_b = category === null || category === void 0 ? void 0 : category.color) !== null && _b !== void 0 ? _b : '#gray',
                                                expectedMinutes: item.activity.defaultExpectedMinutes,
                                                scheduledTime: item.scheduledTime,
                                                startTime: null,
                                                endTime: null,
                                                sessionId: null,
                                            }];
                                }
                            });
                        }); }))];
                case 3:
                    activities = _a.sent();
                    now = nowISO();
                    firstActivity = activities[0];
                    return [4 /*yield*/, sessionRepository.createSession({
                            activityId: firstActivity.activityId,
                            activityNameSnapshot: firstActivity.activityName,
                            categoryId: firstActivity.categoryId,
                            categoryNameSnapshot: firstActivity.categoryName,
                            routineId: routine.id,
                            startTime: now,
                            isPlanned: true,
                            expectedDurationMinutes: firstActivity.expectedMinutes,
                            source: 'routine',
                            isRunning: true,
                            idlePromptEnabled: false,
                        })];
                case 4:
                    session = _a.sent();
                    firstActivity.startTime = now;
                    firstActivity.sessionId = session.id;
                    if (!(firstActivity.expectedMinutes && firstActivity.expectedMinutes > 0)) return [3 /*break*/, 6];
                    startDate = new Date(now);
                    return [4 /*yield*/, scheduleTimerWarning(session.id, firstActivity.activityName, firstActivity.expectedMinutes, startDate)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: 
                // Persist run start time so hydration only counts this run
                return [4 /*yield*/, settingsRepository.setSetting(getRunStartKey(routine.id), now)];
                case 7:
                    // Persist run start time so hydration only counts this run
                    _a.sent();
                    // Show start notification
                    return [4 /*yield*/, showTimerStartNotification(firstActivity.activityName)];
                case 8:
                    // Show start notification
                    _a.sent();
                    return [4 /*yield*/, useTimerStore.getState().loadRunningTimers()];
                case 9:
                    _a.sent();
                    set({
                        runningRoutine: {
                            routineId: routine.id,
                            routineName: routine.name,
                            routineType: routine.routineType,
                            activities: activities,
                            currentActivityIndex: 0,
                            startTime: now,
                            isPaused: false,
                            pausedAt: null,
                            totalPausedDuration: 0,
                            completedOccurrencesSeconds: 0,
                            activityDurations: {},
                        },
                        isLoading: false,
                        lastAutoStartedRoutineId: get().lastAutoStartedRoutineId,
                    });
                    return [3 /*break*/, 12];
                case 10:
                    error_1 = _a.sent();
                    console.error('Error starting routine:', error_1);
                    return [4 /*yield*/, settingsRepository.deleteSetting(getRunStartKey(routineId))];
                case 11:
                    _a.sent();
                    set({
                        error: error_1 instanceof Error ? error_1.message : 'Failed to start routine',
                        isLoading: false
                    });
                    throw error_1;
                case 12: return [2 /*return*/];
            }
        });
    }); },
    pauseRoutine: function () {
        var runningRoutine = get().runningRoutine;
        if (!runningRoutine || runningRoutine.isPaused) {
            return;
        }
        set({
            runningRoutine: __assign(__assign({}, runningRoutine), { isPaused: true, pausedAt: nowISO() }),
        });
        // Cancel notifications when paused
        var currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
        if (currentActivity.sessionId) {
            cancelTimerNotifications(currentActivity.sessionId);
        }
    },
    resumeRoutine: function () {
        var runningRoutine = get().runningRoutine;
        if (!runningRoutine || !runningRoutine.isPaused || !runningRoutine.pausedAt) {
            return;
        }
        var pauseDuration = calculateDurationMinutes(runningRoutine.pausedAt, nowISO()) * 60;
        var currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
        set({
            runningRoutine: __assign(__assign({}, runningRoutine), { isPaused: false, pausedAt: null, totalPausedDuration: runningRoutine.totalPausedDuration + pauseDuration }),
        });
        // Reschedule notifications for remaining time
        if (currentActivity.expectedMinutes && currentActivity.startTime && currentActivity.sessionId) {
            var elapsed = get().getCurrentActivityDuration() / 60; // Convert to minutes
            var remaining = currentActivity.expectedMinutes - elapsed;
            if (remaining > 5) {
                var adjustedStartTime = new Date(Date.now() - (elapsed * 60 * 1000));
                scheduleTimerWarning(currentActivity.sessionId, currentActivity.activityName, Math.floor(remaining), adjustedStartTime);
            }
        }
    },
    nextActivity: function () { return __awaiter(void 0, void 0, void 0, function () {
        var runningRoutine, currentActivity, now, activityKey, elapsedSeconds, updatedActivityDurations, nextIndex, nextActivity, session, updatedActivities, startDate;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    runningRoutine = get().runningRoutine;
                    if (!runningRoutine) {
                        return [2 /*return*/];
                    }
                    currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
                    now = nowISO();
                    activityKey = currentActivity.activityId || currentActivity.activityName;
                    elapsedSeconds = 0;
                    if (!(currentActivity.sessionId && currentActivity.startTime)) return [3 /*break*/, 2];
                    return [4 /*yield*/, sessionRepository.stopSession(currentActivity.sessionId)];
                case 1:
                    _b.sent();
                    elapsedSeconds = calculateDurationSeconds(currentActivity.startTime, now);
                    // Cancel current notifications
                    cancelTimerNotifications(currentActivity.sessionId);
                    _b.label = 2;
                case 2:
                    updatedActivityDurations = __assign({}, runningRoutine.activityDurations);
                    updatedActivityDurations[activityKey] = ((_a = updatedActivityDurations[activityKey]) !== null && _a !== void 0 ? _a : 0) + elapsedSeconds;
                    nextIndex = runningRoutine.currentActivityIndex + 1;
                    if (!(nextIndex >= runningRoutine.activities.length)) return [3 /*break*/, 4];
                    // No more activities - stop routine
                    return [4 /*yield*/, get().stopRoutine()];
                case 3:
                    // No more activities - stop routine
                    _b.sent();
                    return [2 /*return*/];
                case 4:
                    nextActivity = runningRoutine.activities[nextIndex];
                    return [4 /*yield*/, sessionRepository.createSession({
                            activityId: nextActivity.activityId,
                            activityNameSnapshot: nextActivity.activityName,
                            categoryId: nextActivity.categoryId,
                            categoryNameSnapshot: nextActivity.categoryName,
                            routineId: runningRoutine.routineId,
                            startTime: now,
                            isPlanned: true,
                            expectedDurationMinutes: nextActivity.expectedMinutes,
                            source: 'routine',
                            isRunning: true,
                            idlePromptEnabled: false,
                        })];
                case 5:
                    session = _b.sent();
                    updatedActivities = runningRoutine.activities.map(function (activity, idx) {
                        if (idx === runningRoutine.currentActivityIndex) {
                            return __assign(__assign({}, activity), { endTime: now });
                        }
                        if (idx === nextIndex) {
                            return __assign(__assign({}, activity), { startTime: now, sessionId: session.id });
                        }
                        return activity;
                    });
                    if (!(nextActivity.expectedMinutes && nextActivity.expectedMinutes > 0)) return [3 /*break*/, 7];
                    startDate = new Date(now);
                    return [4 /*yield*/, scheduleTimerWarning(session.id, nextActivity.activityName, nextActivity.expectedMinutes, startDate)];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7: 
                // Show start notification
                return [4 /*yield*/, showTimerStartNotification(nextActivity.activityName)];
                case 8:
                    // Show start notification
                    _b.sent();
                    return [4 /*yield*/, useTimerStore.getState().loadRunningTimers()];
                case 9:
                    _b.sent();
                    set({
                        runningRoutine: __assign(__assign({}, runningRoutine), { activities: updatedActivities, currentActivityIndex: nextIndex, completedOccurrencesSeconds: runningRoutine.completedOccurrencesSeconds + elapsedSeconds, activityDurations: updatedActivityDurations }),
                    });
                    return [2 /*return*/];
            }
        });
    }); },
    stopRoutine: function () { return __awaiter(void 0, void 0, void 0, function () {
        var runningRoutine, now, currentActivity;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    runningRoutine = get().runningRoutine;
                    if (!runningRoutine) {
                        return [2 /*return*/];
                    }
                    now = nowISO();
                    currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
                    if (!(currentActivity.sessionId && currentActivity.startTime && !currentActivity.endTime)) return [3 /*break*/, 2];
                    return [4 /*yield*/, sessionRepository.stopSession(currentActivity.sessionId)];
                case 1:
                    _a.sent();
                    currentActivity.endTime = now;
                    // Cancel all notifications
                    cancelTimerNotifications(currentActivity.sessionId);
                    _a.label = 2;
                case 2: return [4 /*yield*/, settingsRepository.deleteSetting(getRunStartKey(runningRoutine.routineId))];
                case 3:
                    _a.sent();
                    set({ runningRoutine: null, lastAutoStartedRoutineId: null });
                    return [4 /*yield*/, useTimerStore.getState().loadRunningTimers()];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    getCurrentActivityDuration: function () {
        var _a;
        var runningRoutine = get().runningRoutine;
        if (!runningRoutine) {
            return 0;
        }
        var currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
        var activityKey = currentActivity.activityId || currentActivity.activityName;
        var baseSeconds = (_a = runningRoutine.activityDurations[activityKey]) !== null && _a !== void 0 ? _a : 0;
        if (!currentActivity.startTime) {
            return baseSeconds;
        }
        var endTime = runningRoutine.isPaused && runningRoutine.pausedAt
            ? runningRoutine.pausedAt
            : nowISO();
        var currentSeconds = calculateDurationSeconds(currentActivity.startTime, endTime);
        return baseSeconds + currentSeconds;
    },
    getTotalRoutineDuration: function () {
        var runningRoutine = get().runningRoutine;
        if (!runningRoutine) {
            return 0;
        }
        var currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
        var endTime = runningRoutine.isPaused && runningRoutine.pausedAt
            ? runningRoutine.pausedAt
            : nowISO();
        var completedSeconds = runningRoutine.completedOccurrencesSeconds;
        var currentSeconds = currentActivity.startTime
            ? calculateDurationSeconds(currentActivity.startTime, endTime)
            : 0;
        return completedSeconds + currentSeconds;
    },
    clearError: function () { return set({ error: null }); },
    hydrateRunningRoutine: function () { return __awaiter(void 0, void 0, void 0, function () {
        var existing, runningSessions, routineSession_1, routine, db, runStartKey, storedRunStart, runStartTime, allRoutineSessions, routineStartTime, completedOccurrencesSeconds, activityDurations, _i, allRoutineSessions_1, session, durationSeconds, key, ordered, currentSessionIndex, fallbackIndex, currentIndex, currentSession, activities, idx, item, catRows, category, err_1;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 10, , 11]);
                    existing = get().runningRoutine;
                    return [4 /*yield*/, sessionRepository.getRunningSession()];
                case 1:
                    runningSessions = _g.sent();
                    routineSession_1 = runningSessions.find(function (s) { return s.source === 'routine' && s.routineId; });
                    if (!routineSession_1 || !routineSession_1.routineId) {
                        set({ runningRoutine: null });
                        return [2 /*return*/];
                    }
                    // If our in-memory routine already matches the running session, keep it
                    if (existing &&
                        existing.routineId === routineSession_1.routineId &&
                        ((_a = existing.activities[existing.currentActivityIndex]) === null || _a === void 0 ? void 0 : _a.sessionId) === routineSession_1.id) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, getRoutineWithItems(routineSession_1.routineId)];
                case 2:
                    routine = _g.sent();
                    if (!routine || !routine.items.length) {
                        set({ runningRoutine: null });
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, import('../database')];
                case 3:
                    db = _g.sent();
                    runStartKey = getRunStartKey(routineSession_1.routineId);
                    return [4 /*yield*/, settingsRepository.getSetting(runStartKey)];
                case 4:
                    storedRunStart = _g.sent();
                    runStartTime = storedRunStart !== null && storedRunStart !== void 0 ? storedRunStart : routineSession_1.startTime;
                    return [4 /*yield*/, db.executeQuery("SELECT id, start_time, end_time, actual_duration_minutes, activity_id, activity_name_snapshot, is_running \n         FROM time_sessions \n         WHERE routine_id = ? AND start_time >= ?\n         ORDER BY start_time ASC", [routineSession_1.routineId, runStartTime])];
                case 5:
                    allRoutineSessions = _g.sent();
                    routineStartTime = allRoutineSessions.length > 0 ? allRoutineSessions[0].start_time : runStartTime;
                    completedOccurrencesSeconds = allRoutineSessions
                        .filter(function (session) { return session.is_running === 0 && session.end_time !== null; })
                        .reduce(function (sum, session) {
                        var durationSeconds = session.actual_duration_minutes !== null
                            ? session.actual_duration_minutes * 60
                            : session.end_time
                                ? calculateDurationSeconds(session.start_time, session.end_time)
                                : 0;
                        return sum + durationSeconds;
                    }, 0);
                    activityDurations = {};
                    for (_i = 0, allRoutineSessions_1 = allRoutineSessions; _i < allRoutineSessions_1.length; _i++) {
                        session = allRoutineSessions_1[_i];
                        if (session.is_running === 1) {
                            continue;
                        }
                        durationSeconds = session.actual_duration_minutes !== null
                            ? session.actual_duration_minutes * 60
                            : session.end_time
                                ? calculateDurationSeconds(session.start_time, session.end_time)
                                : 0;
                        key = (_b = session.activity_id) !== null && _b !== void 0 ? _b : session.activity_name_snapshot;
                        activityDurations[key] = ((_c = activityDurations[key]) !== null && _c !== void 0 ? _c : 0) + durationSeconds;
                    }
                    ordered = __spreadArray([], routine.items, true).sort(function (a, b) { return a.displayOrder - b.displayOrder; });
                    currentSessionIndex = allRoutineSessions.findIndex(function (s) { return s.id === routineSession_1.id; });
                    fallbackIndex = Math.max(0, Math.min(allRoutineSessions.length - 1, ordered.length - 1));
                    currentIndex = currentSessionIndex >= 0 ? Math.min(currentSessionIndex, ordered.length - 1) : fallbackIndex;
                    currentSession = currentSessionIndex >= 0
                        ? allRoutineSessions[currentSessionIndex]
                        : (_d = allRoutineSessions[fallbackIndex]) !== null && _d !== void 0 ? _d : routineSession_1;
                    activities = [];
                    idx = 0;
                    _g.label = 6;
                case 6:
                    if (!(idx < ordered.length)) return [3 /*break*/, 9];
                    item = ordered[idx];
                    return [4 /*yield*/, db.executeQuery('SELECT id, name, color FROM categories WHERE id = ?', [item.activity.categoryId])];
                case 7:
                    catRows = _g.sent();
                    category = catRows[0];
                    activities.push({
                        id: item.id,
                        activityId: item.activityId,
                        activityName: item.activity.name,
                        categoryId: item.activity.categoryId,
                        categoryName: (_e = category === null || category === void 0 ? void 0 : category.name) !== null && _e !== void 0 ? _e : item.activity.name,
                        categoryColor: (_f = category === null || category === void 0 ? void 0 : category.color) !== null && _f !== void 0 ? _f : '#6B7280',
                        expectedMinutes: item.activity.defaultExpectedMinutes,
                        scheduledTime: item.scheduledTime,
                        startTime: idx === currentIndex ? currentSession.start_time : null,
                        endTime: null,
                        sessionId: idx === currentIndex ? currentSession.id : null,
                    });
                    _g.label = 8;
                case 8:
                    idx++;
                    return [3 /*break*/, 6];
                case 9:
                    set({
                        runningRoutine: {
                            routineId: routine.id,
                            routineName: routine.name,
                            routineType: routine.routineType,
                            activities: activities,
                            currentActivityIndex: currentIndex >= 0 ? currentIndex : 0,
                            startTime: routineStartTime,
                            isPaused: false,
                            pausedAt: null,
                            totalPausedDuration: 0,
                            completedOccurrencesSeconds: completedOccurrencesSeconds,
                            activityDurations: activityDurations,
                        },
                        lastAutoStartedRoutineId: routine.id,
                    });
                    return [3 /*break*/, 11];
                case 10:
                    err_1 = _g.sent();
                    console.warn('Failed to hydrate running routine', err_1);
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    }); },
    markAutoStartedRoutine: function (id) { return set({ lastAutoStartedRoutineId: id }); },
}); });
