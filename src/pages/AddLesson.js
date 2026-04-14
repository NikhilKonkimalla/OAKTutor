import React, { useState } from 'react';
import {
    AppBar,
    Toolbar,
    Button,
    TextField,
    Grid,
    Box,
    Typography,
    Card,
    CardContent,
    IconButton,
    Chip,
    makeStyles
} from '@material-ui/core';
import { ArrowBack, Add, Delete, Edit, Save, Cancel } from '@material-ui/icons';
import { useHistory, useParams } from 'react-router-dom';
import BrandLogoNav from '@components/BrandLogoNav';
import { getCoursePlans } from '../config/config.js';

const useStyles = makeStyles((theme) => ({
    root: {
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
    },
    appBar: {
        backgroundColor: '#1976d2',
        color: '#ffffff',
    },
    container: {
        padding: theme.spacing(4),
        maxWidth: '800px',
        margin: '0 auto',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: theme.spacing(3),
    },
    lessonCard: {
        backgroundColor: '#1976d2',
        borderRadius: '6px',
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
    builtInLessonCard: {
        backgroundColor: '#455a64',
        borderRadius: '6px',
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
    addButton: {
        backgroundColor: '#1976d2',
        color: '#ffffff',
        '&:hover': {
            backgroundColor: '#1565c0',
        },
    },
    saveButton: {
        backgroundColor: '#28a745',
        color: '#ffffff',
        padding: '12px 32px',
        fontSize: '16px',
        '&:hover': {
            backgroundColor: '#218838',
        },
    },
    backButton: {
        color: '#ffffff',
    },
    title: {
        color: '#1976d2',
        fontWeight: 'bold',
        marginBottom: theme.spacing(1),
    },
    sectionTitle: {
        color: '#1976d2',
        fontWeight: '600',
        marginBottom: theme.spacing(2),
    },
    chip: {
        backgroundColor: '#e3f2fd',
        color: '#1976d2',
        margin: '2px',
    },
    textField: {
        '& .MuiInputBase-root': {
            color: '#000000',
            backgroundColor: '#ffffff',
        },
        '& .MuiInputLabel-root': {
            color: '#666666',
        },
        '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
            '& fieldset': {
                borderColor: '#cccccc',
            },
            '&:hover fieldset': {
                borderColor: '#1976d2',
            },
            '&.Mui-focused fieldset': {
                borderColor: '#1976d2',
            },
        },
    },
    editField: {
        '& .MuiInputBase-root': {
            color: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.15)',
        },
        '& .MuiInputLabel-root': {
            color: 'rgba(255,255,255,0.8)',
        },
        '& .MuiInput-underline:before': {
            borderBottomColor: 'rgba(255,255,255,0.5)',
        },
        '& .MuiInput-underline:after': {
            borderBottomColor: '#ffffff',
        },
        '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
            borderBottomColor: 'rgba(255,255,255,0.8)',
        },
        '& .MuiInputBase-input': {
            color: '#ffffff',
        },
    },
}));

const readCustomLessonsForCourse = (courseName) => {
    try {
        const all = JSON.parse(localStorage.getItem('customLessons') || '[]');
        return all.filter(l => l.courseName === courseName);
    } catch (e) {
        return [];
    }
};

const readLessonOverrides = () => {
    try {
        return JSON.parse(localStorage.getItem('lessonOverrides') || '{}');
    } catch (e) {
        return {};
    }
};

const generateLessonId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 25; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const AddLesson = () => {
    const classes = useStyles();
    const history = useHistory();
    const { courseNum } = useParams();

    const coursePlans = getCoursePlans().filter(({ editor }) => !!!editor);
    const courseIndex = parseInt(courseNum, 10);
    const course = coursePlans[courseIndex];
    const courseName = course ? course.courseName : '';

    const [lessonData, setLessonData] = useState({
        id: '',
        name: '',
        topics: '',
        allowRecycle: true,
        learningObjectives: {}
    });

    const [currentObjective, setCurrentObjective] = useState({
        name: '',
        mastery: 0.85
    });

    const [customLessons, setCustomLessons] = useState(() => readCustomLessonsForCourse(courseName));
    const [overrides, setOverrides] = useState(() => readLessonOverrides());
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState({ name: '', topics: '' });

    const builtInLessons = course ? course.lessons || [] : [];
    const allManagedLessons = [
        ...builtInLessons.map(l => ({
            ...l,
            name: (overrides[l.id] && overrides[l.id].name) || l.name || '',
            topics: (overrides[l.id] && overrides[l.id].topics !== undefined) ? overrides[l.id].topics : (l.topics || ''),
            isBuiltIn: true
        })),
        ...customLessons.map(l => ({ ...l, isBuiltIn: false }))
    ];

    const handleLessonChange = (field, value) => {
        setLessonData(prev => ({ ...prev, [field]: value }));
    };

    const addLearningObjective = () => {
        if (currentObjective.name && currentObjective.name.trim()) {
            setLessonData(prev => ({
                ...prev,
                learningObjectives: {
                    ...prev.learningObjectives,
                    [currentObjective.name.trim()]: currentObjective.mastery || 0.85
                }
            }));
            setCurrentObjective({ name: '', mastery: 0.85 });
        }
    };

    const removeLearningObjective = (objectiveName) => {
        setLessonData(prev => {
            const updated = { ...prev.learningObjectives };
            delete updated[objectiveName];
            return { ...prev, learningObjectives: updated };
        });
    };

    const handleSaveLesson = () => {
        if (!lessonData.name.trim()) {
            alert('Please enter a lesson name');
            return;
        }

        const lessonId = lessonData.id.trim() || generateLessonId();

        // Check for duplicate IDs
        const existing = JSON.parse(localStorage.getItem('customLessons') || '[]');
        if (existing.some(l => l.id === lessonId)) {
            alert('A lesson with this ID already exists. Please use a different ID or auto-generate one.');
            return;
        }

        const newLesson = {
            ...lessonData,
            id: lessonId,
            courseName,
            created: new Date().toISOString()
        };

        try {
            existing.push(newLesson);
            localStorage.setItem('customLessons', JSON.stringify(existing));
            setCustomLessons(prev => [...prev, newLesson]);

            setLessonData({ id: '', name: '', topics: '', allowRecycle: true, learningObjectives: {} });
            setCurrentObjective({ name: '', mastery: 0.85 });

            alert(`Lesson "${lessonData.name}" added successfully! You can now add problems to it from the course view.`);
        } catch (error) {
            console.error('Error saving lesson:', error);
            alert('Error saving lesson. Please try again.');
        }
    };

    const handleDeleteLesson = (lessonId) => {
        if (window.confirm('Are you sure you want to delete this lesson? This cannot be undone.')) {
            try {
                const all = JSON.parse(localStorage.getItem('customLessons') || '[]');
                const updated = all.filter(l => l.id !== lessonId);
                localStorage.setItem('customLessons', JSON.stringify(updated));
                setCustomLessons(prev => prev.filter(l => l.id !== lessonId));
            } catch (error) {
                console.error('Error deleting lesson:', error);
                alert('Error deleting lesson. Please try again.');
            }
        }
    };

    const handleStartEdit = (lesson) => {
        setEditingId(lesson.id);
        setEditDraft({ name: lesson.name || '', topics: lesson.topics || '' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditDraft({ name: '', topics: '' });
    };

    const handleSaveEdit = (lesson) => {
        try {
            if (lesson.isBuiltIn) {
                const updated = { ...overrides, [lesson.id]: { name: editDraft.name, topics: editDraft.topics } };
                localStorage.setItem('lessonOverrides', JSON.stringify(updated));
                setOverrides(updated);
            } else {
                const all = JSON.parse(localStorage.getItem('customLessons') || '[]');
                const updated = all.map(l => l.id === lesson.id ? { ...l, name: editDraft.name, topics: editDraft.topics } : l);
                localStorage.setItem('customLessons', JSON.stringify(updated));
                setCustomLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, name: editDraft.name, topics: editDraft.topics } : l));
            }
            setEditingId(null);
            setEditDraft({ name: '', topics: '' });
        } catch (error) {
            console.error('Error saving edit:', error);
            alert('Error saving changes. Please try again.');
        }
    };

    if (!course) {
        return (
            <div className={classes.root}>
                <AppBar position="static" className={classes.appBar}>
                    <Toolbar>
                        <IconButton edge="start" className={classes.backButton} onClick={() => history.push('/')}>
                            <ArrowBack />
                        </IconButton>
                        <BrandLogoNav noLink={true} />
                    </Toolbar>
                </AppBar>
                <Box textAlign="center" pt={8}>
                    <Typography variant="h5" color="error">Course not found.</Typography>
                    <Button onClick={() => history.push('/')} style={{ marginTop: 16 }}>Go Home</Button>
                </Box>
            </div>
        );
    }

    return (
        <div className={classes.root}>
            <AppBar position="static" className={classes.appBar}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        className={classes.backButton}
                        onClick={() => history.push(`/courses/${courseNum}`)}
                    >
                        <ArrowBack />
                    </IconButton>
                    <BrandLogoNav noLink={true} />
                </Toolbar>
            </AppBar>

            <div className={classes.container}>
                <Typography variant="h4" className={classes.title}>
                    Add New Lesson
                </Typography>
                <Typography variant="subtitle1" color="textSecondary" style={{ marginBottom: 24 }}>
                    Course: <strong>{courseName}</strong>
                </Typography>

                {/* Lesson Form */}
                <Card className={classes.card}>
                    <CardContent>
                        <Typography variant="h6" className={classes.sectionTitle}>
                            Lesson Information
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth
                                    label="Lesson ID (optional — auto-generated if empty)"
                                    value={lessonData.id}
                                    onChange={(e) => handleLessonChange('id', e?.target?.value || '')}
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} sm={4} style={{ display: 'flex', alignItems: 'center' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => handleLessonChange('id', generateLessonId())}
                                    className={classes.addButton}
                                    fullWidth
                                >
                                    Generate ID
                                </Button>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Lesson Name *"
                                    value={lessonData.name}
                                    onChange={(e) => handleLessonChange('name', e?.target?.value || '')}
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                    variant="outlined"
                                    helperText="The title displayed on the lesson card (e.g. Variables, Functions, Loops)"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Topics / Language"
                                    value={lessonData.topics}
                                    onChange={(e) => handleLessonChange('topics', e?.target?.value || '')}
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                    variant="outlined"
                                    helperText="Shown as a subtitle on the lesson card (e.g. Python, JavaScript)"
                                />
                            </Grid>
                        </Grid>

                        {/* Learning Objectives */}
                        <Box mt={3}>
                            <Typography variant="subtitle1" className={classes.sectionTitle}>
                                Learning Objectives (optional)
                            </Typography>
                            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
                                Knowledge component IDs mapped to their mastery thresholds. Used by the adaptive tutor.
                            </Typography>

                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={5}>
                                    <TextField
                                        fullWidth
                                        label="Knowledge Component ID"
                                        value={currentObjective.name}
                                        onChange={(e) => setCurrentObjective(prev => ({ ...prev, name: e?.target?.value || '' }))}
                                        className={classes.textField}
                                        InputLabelProps={{ shrink: true }}
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Mastery Level"
                                        value={currentObjective.mastery}
                                        onChange={(e) => setCurrentObjective(prev => ({
                                            ...prev,
                                            mastery: parseFloat(e?.target?.value) || 0.85
                                        }))}
                                        inputProps={{ min: 0, max: 1, step: 0.01 }}
                                        className={classes.textField}
                                        InputLabelProps={{ shrink: true }}
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Button
                                        variant="contained"
                                        onClick={addLearningObjective}
                                        className={classes.addButton}
                                        startIcon={<Add />}
                                        fullWidth
                                        disabled={!currentObjective.name.trim()}
                                    >
                                        Add Objective
                                    </Button>
                                </Grid>
                            </Grid>

                            {Object.keys(lessonData.learningObjectives).length > 0 && (
                                <Box mt={2}>
                                    {Object.entries(lessonData.learningObjectives).map(([name, mastery]) => (
                                        <Chip
                                            key={name}
                                            label={`${name} (${mastery})`}
                                            onDelete={() => removeLearningObjective(name)}
                                            className={classes.chip}
                                            deleteIcon={<Delete />}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSaveLesson}
                        className={classes.saveButton}
                        startIcon={<Add />}
                        disabled={!lessonData.name.trim()}
                    >
                        Add Lesson
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => history.push(`/courses/${courseNum}`)}
                    >
                        Back to Course
                    </Button>
                </Box>

                {/* Manage All Lessons */}
                {allManagedLessons.length > 0 && (
                    <Card className={classes.card}>
                        <CardContent>
                            <Typography variant="h6" className={classes.sectionTitle}>
                                Manage Lessons ({allManagedLessons.length})
                            </Typography>

                            {allManagedLessons.map((lesson) => {
                                const isEditing = editingId === lesson.id;
                                return (
                                    <div
                                        key={lesson.id}
                                        className={lesson.isBuiltIn ? classes.builtInLessonCard : classes.lessonCard}
                                    >
                                        {isEditing ? (
                                            <Box>
                                                <TextField
                                                    fullWidth
                                                    label="Lesson Name"
                                                    value={editDraft.name}
                                                    onChange={(e) => setEditDraft(d => ({ ...d, name: e.target.value }))}
                                                    className={classes.editField}
                                                    InputLabelProps={{ shrink: true }}
                                                    style={{ marginBottom: 12 }}
                                                />
                                                <TextField
                                                    fullWidth
                                                    label="Topics / Language"
                                                    value={editDraft.topics}
                                                    onChange={(e) => setEditDraft(d => ({ ...d, topics: e.target.value }))}
                                                    className={classes.editField}
                                                    InputLabelProps={{ shrink: true }}
                                                    style={{ marginBottom: 16 }}
                                                />
                                                <Box display="flex" style={{ gap: 8 }}>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={<Save />}
                                                        onClick={() => handleSaveEdit(lesson)}
                                                        disabled={!editDraft.name.trim()}
                                                        style={{ backgroundColor: '#ffffff', color: lesson.isBuiltIn ? '#455a64' : '#1976d2', fontWeight: 600 }}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<Cancel />}
                                                        onClick={handleCancelEdit}
                                                        style={{ borderColor: 'rgba(255,255,255,0.6)', color: '#ffffff' }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Box flex={1}>
                                                    <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: '#ffffff' }}>
                                                        {lesson.name || ''}
                                                    </Typography>
                                                    {lesson.topics && (
                                                        <Typography variant="body2" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                                            Topics: {lesson.topics}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="body2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                                        ID: {lesson.id}
                                                    </Typography>
                                                    {!lesson.isBuiltIn && (
                                                        <Typography variant="body2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                                            Learning Objectives: {Object.keys(lesson.learningObjectives || {}).length}
                                                        </Typography>
                                                    )}
                                                    {lesson.isBuiltIn && (
                                                        <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                                                            Built-in lesson
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Box display="flex" alignItems="center">
                                                    <IconButton
                                                        onClick={() => handleStartEdit(lesson)}
                                                        style={{ color: 'rgba(255,255,255,0.85)' }}
                                                        title="Edit lesson"
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                    {!lesson.isBuiltIn && (
                                                        <IconButton
                                                            onClick={() => handleDeleteLesson(lesson.id)}
                                                            style={{ color: '#ff6b6b' }}
                                                            title="Delete lesson"
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            </Box>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default AddLesson;
