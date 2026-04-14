import React, { useState, useEffect } from 'react';
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
    makeStyles,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@material-ui/core';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import { useHistory, useParams } from 'react-router-dom';
import BrandLogoNav from '@components/BrandLogoNav';
import { getCustomProblems } from '../config/config.js';

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
    stepCard: {
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '6px',
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
        color: '#000000',
        '& .MuiTypography-colorTextSecondary': {
            color: '#555555',
        },
    },
    hintCard: {
        backgroundColor: '#f1f3f4',
        border: '1px solid #dadce0',
        borderRadius: '4px',
        padding: theme.spacing(1.5),
        marginBottom: theme.spacing(1),
    },
    addButton: {
        backgroundColor: '#1976d2',
        color: '#ffffff',
        '&:hover': {
            backgroundColor: '#1565c0',
        },
    },
    saveButton: {
        backgroundColor: '#4caf50',
        color: '#ffffff',
        marginRight: theme.spacing(2),
        '&:hover': {
            backgroundColor: '#45a049',
        },
    },
    deleteButton: {
        backgroundColor: '#f44336',
        color: '#ffffff',
        '&:hover': {
            backgroundColor: '#da190b',
        },
    },
    backButton: {
        color: '#ffffff',
        marginRight: theme.spacing(2),
    },
    title: {
        color: '#1976d2',
        marginBottom: theme.spacing(3),
        fontWeight: 'bold',
    },
    sectionTitle: {
        color: '#1976d2',
        marginBottom: theme.spacing(2),
        fontWeight: 'bold',
    },
    textField: {
        '& .MuiInputBase-input': {
            color: '#000000',
        },
        '& .MuiInputLabel-root': {
            color: '#666666',
        },
        '& .MuiOutlinedInput-root': {
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

const EditProblem = () => {
    const classes = useStyles();
    const history = useHistory();
    const { lessonID, problemID } = useParams();
    
    const [problemData, setProblemData] = useState({
        id: '',
        title: '',
        body: '',
        oer: '',
        license: '',
        steps: []
    });
    
    const [currentStep, setCurrentStep] = useState({
        id: '',
        stepTitle: '',
        stepBody: '',
        problemType: 'TextBox',
        answerType: 'string',
        stepAnswer: '',
        choices: []
    });
    
    const [currentHint, setCurrentHint] = useState({
        id: '',
        title: '',
        text: '',
        type: 'hint',
        dependencies: [],
        hintAnswer: [],
        problemType: 'TextBox',
        answerType: 'string',
        choices: []
    });
    
    const [editingStepIndex, setEditingStepIndex] = useState(null);

    // Load existing problem data
    useEffect(() => {
        const customProblems = getCustomProblems();
        const problem = customProblems.find(p => p.id === problemID);
        if (problem) {
            setProblemData(problem);
        } else {
            alert('Problem not found');
            history.push(`/lessons/${lessonID}/problems`);
        }
    }, [problemID, lessonID, history]);


    const handleProblemChange = (field, value) => {
        setProblemData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleStepChange = (field, value) => {
        setCurrentStep(prev => ({
            ...prev,
            [field]: value
        }));
    };


    const addStep = () => {
        if (!currentStep.stepTitle.trim()) {
            alert('Please enter a step title');
            return;
        }
        
        // For coding and lesson steps, we don't require a traditional step answer
        if (currentStep.problemType !== 'Coding' && currentStep.problemType !== 'Lesson') {
            if (!currentStep.stepAnswer || !currentStep.stepAnswer.trim()) {
                alert('Please enter a step answer');
                return;
            }
        }
        
        // Process the step answer - split by commas and clean up (only for non-coding, non-lesson steps)
        const stepAnswer = (currentStep.problemType === 'Coding' || currentStep.problemType === 'Lesson') ? [] : 
            (typeof currentStep.stepAnswer === 'string' 
                ? currentStep.stepAnswer.split(',').map(a => a.trim()).filter(a => a)
                : currentStep.stepAnswer);
        
        const stepId = currentStep.id || `${problemData.id || 'problem'}_step${problemData.steps.length + 1}`;
        const newStep = {
            ...currentStep,
            id: stepId,
            stepAnswer: stepAnswer,
            choices: currentStep.problemType === 'MultipleChoice' ? 
                (Array.isArray(currentStep.choices) ? currentStep.choices : [currentStep.choices]) : [],
            // For coding problems, ensure we have the necessary fields
            ...(currentStep.problemType === 'Coding' && {
                language: 'python',
                codeTemplate: currentStep.codeTemplate || 'def solution():\n    # Your code here\n    pass',
                testCases: currentStep.testCases || []
            })
        };
        
        setProblemData(prev => ({
            ...prev,
            steps: [...prev.steps, newStep]
        }));
        
        setCurrentStep({
            id: '',
            stepTitle: '',
            stepBody: '',
            problemType: 'TextBox',
            answerType: 'string',
            stepAnswer: '',
            choices: [],
            codeTemplate: '',
            testCases: []
        });
    };

    const removeStep = (index) => {
        setProblemData(prev => ({
            ...prev,
            steps: prev.steps.filter((_, i) => i !== index)
        }));
    };

    const startEditingStep = (index) => {
        const step = problemData.steps[index];
        setCurrentStep({
            ...step,
            stepAnswer: Array.isArray(step.stepAnswer) ? step.stepAnswer.join(', ') : step.stepAnswer
        });
        setEditingStepIndex(index);
    };

    const cancelEditingStep = () => {
        setCurrentStep({
            id: '',
            stepTitle: '',
            stepBody: '',
            problemType: 'TextBox',
            answerType: 'string',
            stepAnswer: '',
            choices: [],
            codeTemplate: '',
            testCases: []
        });
        setEditingStepIndex(null);
    };

    const updateStep = () => {
        if (!currentStep.stepTitle.trim()) {
            alert('Please enter a step title');
            return;
        }
        
        // For coding and lesson steps, we don't require a traditional step answer
        if (currentStep.problemType !== 'Coding' && currentStep.problemType !== 'Lesson') {
            if (!currentStep.stepAnswer || !currentStep.stepAnswer.trim()) {
                alert('Please enter a step answer');
                return;
            }
        }
        
        // Process the step answer - split by commas and clean up (only for non-coding, non-lesson steps)
        const stepAnswer = (currentStep.problemType === 'Coding' || currentStep.problemType === 'Lesson') ? [] : 
            (typeof currentStep.stepAnswer === 'string' 
                ? currentStep.stepAnswer.split(',').map(a => a.trim()).filter(a => a)
                : currentStep.stepAnswer);
        
        const updatedStep = {
            ...currentStep,
            stepAnswer: stepAnswer,
            choices: currentStep.problemType === 'MultipleChoice' ? 
                (Array.isArray(currentStep.choices) ? currentStep.choices : [currentStep.choices]) : [],
            // For coding problems, ensure we have the necessary fields
            ...(currentStep.problemType === 'Coding' && {
                language: 'python',
                codeTemplate: currentStep.codeTemplate || 'def solution():\n    # Your code here\n    pass',
                testCases: currentStep.testCases || []
            })
        };
        
        setProblemData(prev => ({
            ...prev,
            steps: prev.steps.map((step, index) => 
                index === editingStepIndex ? updatedStep : step
            )
        }));
        
        cancelEditingStep();
    };

    const removeHint = (stepIndex, hintIndex) => {
        setProblemData(prev => ({
            ...prev,
            steps: prev.steps.map((step, i) => 
                i === stepIndex 
                    ? { ...step, hints: step.hints.filter((_, j) => j !== hintIndex) }
                    : step
            )
        }));
    };

    const handleSaveProblem = () => {
        if (!problemData.title.trim()) {
            alert('Please enter a problem title');
            return;
        }
        
        if (problemData.steps.length === 0) {
            alert('Please add at least one step');
            return;
        }
        
        // Validate that all steps have answers (except coding and lesson steps)
        for (let i = 0; i < problemData.steps.length; i++) {
            const step = problemData.steps[i];
            if (step.problemType === 'Coding') {
                if (!step.codeTemplate || !step.codeTemplate.trim()) {
                    alert(`Please provide a code template for coding step ${i + 1}: "${step.stepTitle}"`);
                    return;
                }
            } else if (step.problemType !== 'Lesson') {
                if (!step.stepAnswer || step.stepAnswer.length === 0 || (step.stepAnswer.length === 1 && !step.stepAnswer[0].trim())) {
                    alert(`Please enter an answer for step ${i + 1}: "${step.stepTitle}"`);
                    return;
                }
            }
        }
        
        try {
            const updatedProblem = {
                ...problemData,
                variabilization: {},
                steps: problemData.steps.map(step => ({
                    ...step,
                    variabilization: {},
                    hints: step.hints ? {
                        DefaultPathway: step.hints
                    } : {
                        DefaultPathway: []
                    }
                }))
            };
            
            // Update in localStorage
            const savedProblems = JSON.parse(localStorage.getItem('customProblems') || '[]');
            const updatedProblems = savedProblems.map(problem => 
                problem.id === problemID ? updatedProblem : problem
            );
            localStorage.setItem('customProblems', JSON.stringify(updatedProblems));
            
            console.log('Problem updated successfully:', updatedProblem);
            alert(`Problem "${problemData.title}" updated successfully!`);
            history.push(`/lessons/${lessonID}/problems`);
        } catch (error) {
            console.error('Error updating problem:', error);
            alert('Error updating problem. Please try again.');
        }
    };

    const handleDeleteProblem = () => {
        if (window.confirm('Are you sure you want to delete this problem? This action cannot be undone.')) {
            try {
                const savedProblems = JSON.parse(localStorage.getItem('customProblems') || '[]');
                const updatedProblems = savedProblems.filter(problem => problem.id !== problemID);
                localStorage.setItem('customProblems', JSON.stringify(updatedProblems));
                
                // Log to Firebase if available
                if (window.firebase) {
                    try {
                        window.firebase.writeData('problemDeletions', {
                            problemId: problemID,
                            timestamp: Date.now()
                        });
                    } catch (error) {
                        console.warn('Could not log to Firebase:', error);
                    }
                }
                
                alert('Problem deleted successfully!');
                history.push(`/lessons/${lessonID}/problems`);
            } catch (error) {
                console.error('Error deleting problem:', error);
                alert('Error deleting problem. Please try again.');
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
                        onClick={() => history.push(`/lessons/${lessonID}/problems`)}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <BrandLogoNav noLink={true} />
                </Toolbar>
            </AppBar>

            <div className={classes.container}>
                <Typography variant="h4" className={classes.title}>
                    Edit Problem
                </Typography>

                {/* Problem Basic Info */}
                <Card className={classes.card}>
                    <CardContent>
                        <Typography variant="h6" className={classes.sectionTitle}>
                            Problem Information
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Problem ID"
                                    value={problemData.id}
                                    disabled
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Problem Title"
                                    value={problemData.title}
                                    onChange={(e) => handleProblemChange('title', e?.target?.value || '')}
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Problem Body/Description"
                                    value={problemData.body}
                                    onChange={(e) => handleProblemChange('body', e?.target?.value || '')}
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="OER (optional)"
                                    value={problemData.oer}
                                    onChange={(e) => handleProblemChange('oer', e?.target?.value || '')}
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="License (optional)"
                                    value={problemData.license}
                                    onChange={(e) => handleProblemChange('license', e?.target?.value || '')}
                                    className={classes.textField}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Steps */}
                <Card className={classes.card}>
                    <CardContent>
                        <Typography variant="h6" className={classes.sectionTitle}>
                            Problem Steps
                        </Typography>
                        
                        {problemData.steps.map((step, index) => (
                            <div key={index} className={classes.stepCard}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="subtitle1" style={{ fontWeight: 'bold' }}>
                                        Step {index + 1}: {step.stepTitle}
                                    </Typography>
                                    <Box>
                                        <IconButton
                                            onClick={() => startEditingStep(index)}
                                            color="primary"
                                            size="small"
                                            style={{ marginRight: '8px' }}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => removeStep(index)}
                                            color="secondary"
                                            size="small"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </Box>
                                
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                    Type: {step.problemType} | Answer Type: {step.answerType}
                                </Typography>
                                
                                {step.stepBody && (
                                    <Typography variant="body2" gutterBottom>
                                        {step.stepBody}
                                    </Typography>
                                )}
                                
                                {step.problemType !== 'Coding' && step.problemType !== 'Lesson' && (
                                    <Typography variant="body2" color="textSecondary">
                                        Answer: {Array.isArray(step.stepAnswer) ? step.stepAnswer.join(', ') : step.stepAnswer}
                                    </Typography>
                                )}
                                
                                {step.choices && step.choices.length > 0 && (
                                    <Typography variant="body2" color="textSecondary">
                                        Choices: {step.choices.join(', ')}
                                    </Typography>
                                )}

                                {step.problemType === 'Coding' && (
                                    <>
                                        {step.codeTemplate && (
                                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                                <strong>Code Template:</strong>
                                            </Typography>
                                        )}
                                        {step.codeTemplate && (
                                            <Box style={{ 
                                                backgroundColor: '#f5f5f5', 
                                                padding: '8px', 
                                                borderRadius: '4px',
                                                fontFamily: 'monospace',
                                                fontSize: '12px',
                                                whiteSpace: 'pre-wrap',
                                                marginBottom: '8px'
                                            }}>
                                                {step.codeTemplate}
                                            </Box>
                                        )}
                                        {step.testCases && step.testCases.length > 0 && (
                                            <Typography variant="body2" color="textSecondary">
                                                <strong>Test Cases:</strong> {step.testCases.length} test case(s)
                                            </Typography>
                                        )}
                                    </>
                                )}
                                
                                {/* Hints for this step */}
                                {step.hints && step.hints.length > 0 && (
                                    <Box mt={2}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Hints:
                                        </Typography>
                                        {step.hints.map((hint, hintIndex) => (
                                            <div key={hintIndex} className={classes.hintCard}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" style={{ fontWeight: 'bold' }}>
                                                        {hint.title} ({hint.type})
                                                    </Typography>
                                                    <IconButton
                                                        onClick={() => removeHint(index, hintIndex)}
                                                        color="secondary"
                                                        size="small"
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Box>
                                                <Typography variant="body2" color="textSecondary">
                                                    {hint.text}
                                                </Typography>
                                            </div>
                                        ))}
                                    </Box>
                                )}
                            </div>
                        ))}
                        
                        {/* Add/Edit Step Form */}
                        <div className={classes.stepCard}>
                            <Typography variant="subtitle1" gutterBottom>
                                {editingStepIndex !== null ? `Edit Step ${editingStepIndex + 1}` : 'Add New Step'}
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Step ID (optional)"
                                        value={currentStep.id}
                                        onChange={(e) => handleStepChange('id', e?.target?.value || '')}
                                        className={classes.textField}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth className={classes.textField}>
                                        <InputLabel shrink>Problem Type</InputLabel>
                                        <Select
                                            value={currentStep.problemType}
                                            onChange={(e) => handleStepChange('problemType', e?.target?.value || 'TextBox')}
                                        >
                                            <MenuItem value="TextBox">Text Box</MenuItem>
                                            <MenuItem value="MultipleChoice">Multiple Choice</MenuItem>
                                            <MenuItem value="Coding">Coding</MenuItem>
                                            <MenuItem value="Lesson">Lesson (No Answer)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                {currentStep.problemType !== 'Lesson' && (
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth className={classes.textField}>
                                        <InputLabel shrink>Answer Type</InputLabel>
                                        <Select
                                            value={currentStep.answerType}
                                            onChange={(e) => handleStepChange('answerType', e?.target?.value || 'string')}
                                        >
                                            <MenuItem value="string">String</MenuItem>
                                            <MenuItem value="numeric">Numeric</MenuItem>
                                            <MenuItem value="arithmetic">Arithmetic</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                )}
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        required
                                        label="Step Title *"
                                        value={currentStep.stepTitle}
                                        onChange={(e) => handleStepChange('stepTitle', e?.target?.value || '')}
                                        className={classes.textField}
                                        InputLabelProps={{ shrink: true }}
                                        helperText="Enter a clear title for this step"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={2}
                                        label="Step Body (optional)"
                                        value={currentStep.stepBody}
                                        onChange={(e) => handleStepChange('stepBody', e?.target?.value || '')}
                                        className={classes.textField}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                {currentStep.problemType !== 'Coding' && currentStep.problemType !== 'Lesson' && (
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            required
                                            multiline
                                            rows={3}
                                            label="Step Answer * (comma-separated for multiple answers)"
                                            value={Array.isArray(currentStep.stepAnswer) ? currentStep.stepAnswer.join(', ') : (currentStep.stepAnswer || '')}
                                            onChange={(e) => {
                                                const value = e?.target?.value || '';
                                                handleStepChange('stepAnswer', value);
                                            }}
                                            className={classes.textField}
                                            InputLabelProps={{ shrink: true }}
                                            helperText="Enter the correct answer(s) for this step. Use commas to separate multiple answers."
                                        />
                                    </Grid>
                                )}
                                {currentStep.problemType === 'MultipleChoice' && (
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={3}
                                            label="Choices (one per line)"
                                            value={Array.isArray(currentStep.choices) ? currentStep.choices.join('\n') : currentStep.choices}
                                            onChange={(e) => {
                                                const value = e?.target?.value || '';
                                                const choices = value.split('\n').map(c => c.trim()).filter(c => c);
                                                handleStepChange('choices', choices);
                                            }}
                                            className={classes.textField}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                )}
                                {currentStep.problemType === 'Coding' && (
                                    <>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={4}
                                                label="Code Template"
                                                value={currentStep.codeTemplate || ''}
                                                onChange={(e) => handleStepChange('codeTemplate', e?.target?.value || '')}
                                                className={classes.textField}
                                                InputLabelProps={{ shrink: true }}
                                                helperText="Provide a starting code template for students"
                                                placeholder="def solution():\n    # Your code here\n    pass"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={3}
                                                label="Test Cases (JSON format)"
                                                value={Array.isArray(currentStep.testCases) ? JSON.stringify(currentStep.testCases, null, 2) : (currentStep.testCases || '')}
                                                onChange={(e) => {
                                                    const value = e?.target?.value || '';
                                                    // Store the raw string for display, but don't parse yet
                                                    handleStepChange('testCases', value);
                                                }}
                                                onBlur={(e) => {
                                                    try {
                                                        const value = e?.target?.value || '';
                                                        if (value.trim()) {
                                                            const testCases = JSON.parse(value);
                                                            handleStepChange('testCases', testCases);
                                                        }
                                                    } catch (error) {
                                                        // Keep the raw value if JSON is invalid
                                                        console.log('Invalid JSON, keeping raw value');
                                                    }
                                                }}
                                                className={classes.textField}
                                                InputLabelProps={{ shrink: true }}
                                                helperText="Enter test cases in JSON format. Use N/A for input if no parameters needed. Example: [{'input': 'N/A', 'expectedOutput': 'Hello World'}] or [{'input': 'solution()', 'expectedOutput': 'Hello World'}]"
                                                placeholder='[{"input": "N/A", "expectedOutput": "Hello World"}]'
                                            />
                                        </Grid>
                                    </>
                                )}
                                <Grid item xs={12}>
                                    <Box display="flex" gap={2}>
                                        {editingStepIndex !== null ? (
                                            <>
                                                <Button
                                                    variant="contained"
                                                    onClick={updateStep}
                                                    className={classes.addButton}
                                                    startIcon={<EditIcon />}
                                                >
                                                    Update Step
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    onClick={cancelEditingStep}
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                variant="contained"
                                                onClick={addStep}
                                                className={classes.addButton}
                                                startIcon={<AddIcon />}
                                            >
                                                Add Step
                                            </Button>
                                        )}
                                    </Box>
                                </Grid>
                            </Grid>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <Box display="flex" justifyContent="space-between" mt={3}>
                    <Box>
                        <Button
                            variant="contained"
                            onClick={handleSaveProblem}
                            className={classes.saveButton}
                            disabled={!problemData.title.trim() || problemData.steps.length === 0}
                        >
                            Save Changes
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => history.push(`/lessons/${lessonID}/problems`)}
                        >
                            Cancel
                        </Button>
                    </Box>
                    <Button
                        variant="contained"
                        onClick={handleDeleteProblem}
                        className={classes.deleteButton}
                    >
                        Delete Problem
                    </Button>
                </Box>
            </div>
        </div>
    );
};

export default EditProblem;
