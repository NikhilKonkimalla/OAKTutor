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
import { ArrowBack, Add, Delete } from '@material-ui/icons';
import { useHistory } from 'react-router-dom';
import BrandLogoNav from '@components/BrandLogoNav';

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
    formField: {
        marginBottom: theme.spacing(2),
    },
    lessonCard: {
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
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
        padding: '12px 24px',
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
        marginBottom: theme.spacing(3),
    },
    sectionTitle: {
        color: '#495057',
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
}));

const AddCourse = () => {
    const classes = useStyles();
    const history = useHistory();
    const [courseData, setCourseData] = useState({
        courseName: '',
        courseOER: '',
        courseLicense: '',
        lessons: []
    });
    const [currentLesson, setCurrentLesson] = useState({
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

    // Ensure currentObjective is never null/undefined
    const safeCurrentObjective = currentObjective || { name: '', mastery: 0.85 };

    const handleCourseChange = (field, value) => {
        setCourseData(prev => ({
            ...prev,
            [field]: value || ''
        }));
    };

    const handleLessonChange = (field, value) => {
        setCurrentLesson(prev => ({
            ...prev,
            [field]: value || ''
        }));
    };

    const addLearningObjective = () => {
        const name = safeCurrentObjective.name;
        const mastery = safeCurrentObjective.mastery;
        
        if (name && name.trim()) {
            setCurrentLesson(prev => ({
                ...prev,
                learningObjectives: {
                    ...prev.learningObjectives,
                    [name]: mastery || 0.85
                }
            }));
            setCurrentObjective({ name: '', mastery: 0.85 });
        }
    };

    const removeLearningObjective = (objectiveName) => {
        setCurrentLesson(prev => {
            const newObjectives = { ...prev.learningObjectives };
            delete newObjectives[objectiveName];
            return {
                ...prev,
                learningObjectives: newObjectives
            };
        });
    };

    const addLesson = () => {
        if (currentLesson.name && currentLesson.name.trim()) {
            setCourseData(prev => ({
                ...prev,
                lessons: [...prev.lessons, { 
                    ...currentLesson,
                    id: currentLesson.id || generateLessonId()
                }]
            }));
            setCurrentLesson({
                id: '',
                name: '',
                topics: '',
                allowRecycle: true,
                learningObjectives: {}
            });
        }
    };

    const removeLesson = (index) => {
        setCourseData(prev => ({
            ...prev,
            lessons: prev.lessons.filter((_, i) => i !== index)
        }));
    };

    const generateLessonId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 25; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleSaveCourse = () => {
        try {
            // Generate a unique course ID
            const courseId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Prepare the course data in the expected format
            const newCourse = {
                courseName: courseData.courseName,
                courseOER: courseData.courseOER,
                courseLicense: courseData.courseLicense,
                lessons: courseData.lessons.map(lesson => ({
                    ...lesson,
                    id: lesson.id || generateLessonId()
                })),
                id: courseId,
                created: new Date().toISOString(),
                createdBy: 'user' // In a real app, this would be the actual user ID
            };

            // Save to localStorage (in production, this would be sent to your backend)
            const savedCourses = JSON.parse(localStorage.getItem('customCourses') || '[]');
            savedCourses.push(newCourse);
            localStorage.setItem('customCourses', JSON.stringify(savedCourses));

            // Log to Firebase if available (for analytics)
            if (window.firebase) {
                try {
                    window.firebase.writeData('courseCreations', {
                        courseName: courseData.courseName,
                        lessonCount: courseData.lessons.length,
                        timestamp: Date.now()
                    });
                } catch (error) {
                    console.warn('Could not log to Firebase:', error);
                }
            }

            console.log('Course saved successfully:', newCourse);
            alert(`Course "${courseData.courseName}" saved successfully! You can now access it from the course selection page.`);
            history.push('/');
        } catch (error) {
            console.error('Error saving course:', error);
            alert('Error saving course. Please try again.');
        }
    };

    const handleDeleteCourse = (courseId) => {
        if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            try {
                const savedCourses = JSON.parse(localStorage.getItem('customCourses') || '[]');
                const updatedCourses = savedCourses.filter(course => course.id !== courseId);
                localStorage.setItem('customCourses', JSON.stringify(updatedCourses));
                
                // Log to Firebase if available
                if (window.firebase) {
                    try {
                        window.firebase.writeData('courseDeletions', {
                            courseId: courseId,
                            timestamp: Date.now()
                        });
                    } catch (error) {
                        console.warn('Could not log to Firebase:', error);
                    }
                }
                
                alert('Course deleted successfully!');
                // Refresh the page to show updated course list
                window.location.reload();
            } catch (error) {
                console.error('Error deleting course:', error);
                alert('Error deleting course. Please try again.');
            }
        }
    };

    return (
        <div className={classes.root}>
            <AppBar position="static" className={classes.appBar}>
                <Toolbar>
                    <IconButton 
                        edge="start" 
                        className={classes.backButton}
                        onClick={() => history.push('/')}
                    >
                        <ArrowBack />
                    </IconButton>
                    <BrandLogoNav noLink={true} />
                </Toolbar>
            </AppBar>

            <div className={classes.container}>
                <Typography variant="h4" className={classes.title}>
                    Add New Course
                </Typography>

                {/* Course Information */}
                <Card className={classes.card}>
                    <CardContent>
                        <Typography variant="h6" className={classes.sectionTitle}>
                            Course Information
                        </Typography>
                        
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Course Name"
                                    value={courseData.courseName}
                                    onChange={(e) => handleCourseChange('courseName', e?.target?.value || '')}
                                    className={`${classes.formField} ${classes.textField}`}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Course OER (Open Educational Resource URL)"
                                    value={courseData.courseOER}
                                    onChange={(e) => handleCourseChange('courseOER', e?.target?.value || '')}
                                    className={`${classes.formField} ${classes.textField}`}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Course License"
                                    value={courseData.courseLicense}
                                    onChange={(e) => handleCourseChange('courseLicense', e?.target?.value || '')}
                                    className={`${classes.formField} ${classes.textField}`}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Add Lesson Section */}
                <Card className={classes.card}>
                    <CardContent>
                        <Typography variant="h6" className={classes.sectionTitle}>
                            Add Lessons
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Lesson ID"
                                    value={currentLesson.id}
                                    onChange={(e) => handleLessonChange('id', e?.target?.value || '')}
                                    placeholder="Auto-generated if empty"
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Button
                                    variant="outlined"
                                    onClick={() => handleLessonChange('id', generateLessonId())}
                                    className={classes.addButton}
                                >
                                    Generate ID
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Lesson Name"
                                    value={currentLesson.name}
                                    onChange={(e) => handleLessonChange('name', e?.target?.value || '')}
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Topics"
                                    value={currentLesson.topics}
                                    onChange={(e) => handleLessonChange('topics', e?.target?.value || '')}
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>

                        {/* Learning Objectives */}
                        <Box mt={3}>
                            <Typography variant="subtitle1" className={classes.sectionTitle}>
                                Learning Objectives
                            </Typography>
                            
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={5}>
                                    <TextField
                                        fullWidth
                                        label="Objective Name"
                                        value={safeCurrentObjective.name}
                                        onChange={(e) => {
                                            const value = e?.target?.value || '';
                                            setCurrentObjective(prev => ({
                                                ...prev,
                                                name: value
                                            }));
                                        }}
                                        className={classes.textField}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Mastery Level"
                                        value={safeCurrentObjective.mastery}
                                        onChange={(e) => {
                                            const value = e?.target?.value || '0.85';
                                            const mastery = parseFloat(value) || 0.85;
                                            setCurrentObjective(prev => ({
                                                ...prev,
                                                mastery: mastery
                                            }));
                                        }}
                                        inputProps={{ min: 0, max: 1, step: 0.01 }}
                                        className={classes.textField}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Button
                                        variant="contained"
                                        onClick={addLearningObjective}
                                        className={classes.addButton}
                                        startIcon={<Add />}
                                    >
                                        Add Objective
                                    </Button>
                                </Grid>
                            </Grid>

                            {/* Display current learning objectives */}
                            <Box mt={2}>
                                {Object.entries(currentLesson.learningObjectives).map(([name, mastery]) => (
                                    <Chip
                                        key={name}
                                        label={`${name} (${mastery})`}
                                        onDelete={() => removeLearningObjective(name)}
                                        className={classes.chip}
                                        deleteIcon={<Delete />}
                                    />
                                ))}
                            </Box>
                        </Box>

                        <Box mt={3}>
                            <Button
                                variant="contained"
                                onClick={addLesson}
                                className={classes.addButton}
                                startIcon={<Add />}
                                disabled={!currentLesson.name}
                            >
                                Add Lesson
                            </Button>
                        </Box>
                    </CardContent>
                </Card>

                {/* Display Added Lessons */}
                {courseData.lessons.length > 0 && (
                    <Card className={classes.card}>
                        <CardContent>
                            <Typography variant="h6" className={classes.sectionTitle}>
                                Added Lessons ({courseData.lessons.length})
                            </Typography>
                            
                            {courseData.lessons.map((lesson, index) => (
                                <div key={index} className={classes.lessonCard}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="subtitle1" style={{ fontWeight: 'bold' }}>
                                                {lesson.name}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary">
                                                ID: {lesson.id} | Topics: {lesson.topics}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary">
                                                Objectives: {Object.keys(lesson.learningObjectives).length}
                                            </Typography>
                                        </Box>
                                        <IconButton
                                            onClick={() => removeLesson(index)}
                                            color="secondary"
                                        >
                                            <Delete />
                                        </IconButton>
                                    </Box>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Save Button */}
                <Box mt={4} textAlign="center">
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSaveCourse}
                        className={classes.saveButton}
                        disabled={!courseData.courseName || courseData.lessons.length === 0}
                    >
                        Save Course
                    </Button>
                </Box>

                {/* Existing Custom Courses */}
                <Card className={classes.card}>
                    <CardContent>
                        <Typography variant="h6" className={classes.sectionTitle}>
                            Manage Existing Courses
                        </Typography>
                        
                        {(() => {
                            try {
                                const savedCourses = JSON.parse(localStorage.getItem('customCourses') || '[]');
                                if (savedCourses.length === 0) {
                                    return (
                                        <Typography variant="body2" color="textSecondary">
                                            No custom courses found. Create a course above to get started.
                                        </Typography>
                                    );
                                }
                                
                                return savedCourses.map((course, index) => (
                                    <div key={course.id} className={classes.lessonCard}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="subtitle1" style={{ fontWeight: 'bold' }}>
                                                    {course.courseName}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    {course.lessons ? course.lessons.length : 0} lessons
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Created: {new Date(course.created).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <IconButton
                                                    onClick={() => handleDeleteCourse(course.id)}
                                                    color="secondary"
                                                    title="Delete Course"
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    </div>
                                ));
                            } catch (error) {
                                return (
                                    <Typography variant="body2" color="error">
                                        Error loading courses: {error.message}
                                    </Typography>
                                );
                            }
                        })()}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AddCourse;
