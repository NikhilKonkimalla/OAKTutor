import React, {
  useEffect,
  useState,
  useMemo,
  useContext,
} from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Container,
  Grid,
  IconButton,
  Box,
  Typography,
  makeStyles,
  Button,
} from '@material-ui/core';
import HelpOutlineOutlinedIcon from '@material-ui/icons/HelpOutlineOutlined';
import AddIcon from '@material-ui/icons/Add';

import BrandLogoNav from '@components/BrandLogoNav';
import Popup from '@components/Popup/Popup';
import About from '../../pages/Posts/About';
import ProblemWrapper from '@components/problem-layout/ProblemWrapper';
import { findLessonById, ThemeContext, SHOW_COPYRIGHT, SITE_NAME, getCustomProblems } from '../../config/config.js';
import { CONTENT_SOURCE } from '@common/global-config';
import withTranslation from '../../util/withTranslation.js';

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: theme.palette.background.default,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  container: {
    flexGrow: 1,
    padding: theme.spacing(4, 0),
  },
  problemCard: {
    marginBottom: theme.spacing(4),
  },
  noFooterWrapper: {
    '& footer': {
      display: 'none',
    },
    '& div[width="100%"]': {
      display: 'none',
    },
  },
  loadingBox: {
    textAlign: 'center',
    padding: theme.spacing(2),
  },
  footer: {
    marginTop: 'auto',
    padding: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
  },
  spacer: {
    flexGrow: 1,
  },
}));

const BATCH_SIZE = 3;

const ViewAllProblems = ({ translate }) => {
  const classes = useStyles();
  const { lessonID } = useParams();
  const history = useHistory();
  const context = useContext(ThemeContext);

  const [lesson, setLesson] = useState(null);
  const [problemPool, setProblemPool] = useState([]);
  const [customProblems, setCustomProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [visibleProblems, setVisibleProblems] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [seed] = useState(() => Date.now().toString());

  // no-op handlers for ProblemWrapper
  const displayMastery = () => {};
  const problemComplete = () => {};

  // Load pool
  useEffect(() => {
    import(`@generated/processed-content-pool/${CONTENT_SOURCE}.json`)
      .then(m => setProblemPool(m.default || []))
      .catch(console.error);
  }, []);

  // Load custom problems
  useEffect(() => {
    const savedProblems = getCustomProblems();
    setCustomProblems(savedProblems);
  }, []);

  // Find lesson
  useEffect(() => {
    const found = findLessonById(lessonID);
    if (found) setLesson(found);
  }, [lessonID]);

  // Filter by objectives
  const memoFiltered = useMemo(() => {
    if (!lesson) {
      console.log('No lesson found');
      return [];
    }
    
    console.log('Filtering problems for lesson:', lesson);
    console.log('Problem pool length:', problemPool.length);
    console.log('Custom problems length:', customProblems.length);
    console.log('Lesson learning objectives:', lesson.learningObjectives);
    
    // Filter standard problems
    const standardProblems = problemPool.length > 0 ? problemPool.filter(problem => {
      if (!problem.steps) return false;
      return problem.steps.some(step => {
        if (!step.id || !context.skillModel) return false;
        const skills = context.skillModel[step.id] || [];
        return skills.some(kc => kc in (lesson.learningObjectives || {}));
      });
    }) : [];
    
    // Filter custom problems for this lesson
    const customProblemsForLesson = customProblems.filter(problem =>
      problem.lesson === lessonID
    );
    
    console.log('Standard problems found:', standardProblems.length);
    console.log('Custom problems found:', customProblemsForLesson.length);
    
    // Combine both pools
    return [...standardProblems, ...customProblemsForLesson];
  }, [lesson, problemPool, customProblems, context.skillModel, lessonID]);

  useEffect(() => {
    setFilteredProblems(memoFiltered);
  }, [memoFiltered]);

  // Chunk rendering
  useEffect(() => {
  setVisibleProblems(filteredProblems);
}, [filteredProblems]);

  // Safely build topics string
  const topicsText = lesson?.topics
    ? Array.isArray(lesson.topics)
      ? lesson.topics.join(', ')
      : String(lesson.topics)
    : '';

  return (
    <Box className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <Grid container alignItems="center">
            <Grid item xs={3}><BrandLogoNav /></Grid>
            <Grid item xs={6} style={{ textAlign: 'center' }}>
              {lesson?.name}{topicsText && `: ${topicsText}`}
            </Grid>
            <Grid item xs={3} style={{ textAlign: 'right' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => history.push(`/lessons/${lessonID}/add-problem`)}
                style={{ 
                  backgroundColor: '#4caf50',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#45a049',
                  }
                }}
              >
                Add Problem
              </Button>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" className={classes.container}>
        {visibleProblems.length > 0 ? visibleProblems.map(problem => (
          <Box key={problem.id} className={classes.problemCard}>
            <Box className={classes.noFooterWrapper}>
              <ProblemWrapper
                autoScroll={false}
                problem={problem}
                lesson={lesson}
                seed={seed}
                clearStateOnPropChange={lessonID}
                displayMastery={displayMastery}
                problemComplete={problemComplete}
              />
            </Box>
          </Box>
        )) : (
          <Box className={classes.loadingBox}>
            <Typography variant="h6" color="textSecondary" style={{ textAlign: 'center', marginTop: '50px' }}>
              {problemPool.length === 0 && customProblems.length === 0 
                ? 'Loading problems…' 
                : 'No problems available for this lesson yet.'}
            </Typography>
            <Typography variant="body2" color="textSecondary" style={{ textAlign: 'center', marginTop: '10px' }}>
              Click the "Add Problem" button above to create your first problem.
            </Typography>
          </Box>
        )}
      </Container>

      <Box className={classes.footer}>
        <Box component="span">
          {SHOW_COPYRIGHT && `© ${new Date().getFullYear()} ${SITE_NAME}`}
        </Box>
        <Box className={classes.spacer} />
        <IconButton onClick={() => setShowPopup(true)} title={`About ${SITE_NAME}`}>
          <HelpOutlineOutlinedIcon />
        </IconButton>
      </Box>

      <Popup isOpen={showPopup} onClose={() => setShowPopup(false)}>
        <About />
      </Popup>
    </Box>
  );
};

export default withTranslation(ViewAllProblems);
