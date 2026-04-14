import React, { Fragment } from 'react';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import { withStyles } from '@material-ui/core/styles';
import styles from './common-styles.js';
import IconButton from '@material-ui/core/IconButton';
import { ThemeContext, SITE_NAME, SHOW_COPYRIGHT, getCoursePlans, getCustomLessonsForCourse } from '../../config/config.js';
import Spacer from "../Spacer";
import HelpOutlineOutlinedIcon from "@material-ui/icons/HelpOutlineOutlined";
import { Typography } from "@material-ui/core";
import { IS_STAGING_OR_DEVELOPMENT } from "../../util/getBuildType";
import BuildTimeIndicator from "@components/BuildTimeIndicator";
import withTranslation from "../../util/withTranslation.js";
import Popup from '../Popup/Popup.js';
import About from '../../pages/Posts/About.js';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import AddIcon from '@material-ui/icons/Add';
import StarIcon from '@material-ui/icons/Star';

class LessonSelection extends React.Component {
    static contextType = ThemeContext;

    constructor(props, context) {
        super(props);
        const { courseNum, setLanguage } = this.props;

        if (courseNum === 6) {
            setLanguage('se')
        } 
        
        if (props.history.location.pathname === '/') {
            const defaultLocale = localStorage.getItem('defaultLocale');
            setLanguage(defaultLocale)
        }

        this.user = context.user || {}
        this.isPrivileged = !!this.user.privileged

        this.coursePlans = getCoursePlans().filter(({ editor }) => !!!editor);
        this.togglePopup = this.togglePopup.bind(this);

        this.state = {
            preparedRemoveProgress: false,
            removedProgress: false,
            showPopup: false
        }
    }

    togglePopup = () => {
        console.log("Toggling popup visibility");
        this.setState((prevState) => ({
          showPopup: !prevState.showPopup,
        }));
      };
      
    removeProgress = () => {
        this.setState({ removedProgress: true });
        this.props.removeProgress();
    }

    prepareRemoveProgress = () => {
        this.setState({ preparedRemoveProgress: true });
    }

    render() {
        const { translate } = this.props;
        const { classes, courseNum } = this.props;
        const selectionMode = courseNum == null ? "course" : "lesson"
        const { showPopup } = this.state;

        if (selectionMode === "lesson" && courseNum >= this.coursePlans.length) {
            return <Box width={'100%'} textAlign={'center'} pt={4} pb={4}>
                <Typography variant={'h3'}>Course <code>{courseNum}</code> is not valid!</Typography>
            </Box>
        }

        return (
            <>
                <div>
                    <Grid
                        container
                        spacing={0}
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Box width="75%" maxWidth={1500} role={"main"}>
                            <center>
                                {this.isPrivileged
                                    ? <h1 style={{ color: '#666666' }}>{translate('lessonSelection.welcomeInstructor')}</h1>
                                    : <h1 style={{ color: '#666666' }}>{translate('lessonSelection.welcomeTo')} {SITE_NAME.replace(/\s/, "")}!</h1>
                                }

                                <h2 style={{ color: '#666666' }}>{translate('lessonSelection.select')} {selectionMode === "course" ? translate('lessonSelection.course') : translate('lessonSelection.lessonplan')}</h2>
                                {this.isPrivileged
                                    && <h4>(for {this.user.resource_link_title})</h4>
                                }
                                {selectionMode === "course" && (
                                    <Box mb={3}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<AddIcon />}
                                            onClick={() => this.props.history.push('/add-course')}
                                            style={{
                                                backgroundColor: '#1976d2',
                                                color: '#ffffff',
                                                padding: '12px 24px',
                                                fontSize: '16px',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                textTransform: 'none',
                                                fontWeight: '600'
                                            }}
                                        >
                                            Add New Course
                                        </Button>
                                    </Box>
                                )}
                                {selectionMode === "lesson" && (
                                    <Box mb={3}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<AddIcon />}
                                            onClick={() => this.props.history.push(`/courses/${courseNum}/add-lesson`)}
                                            style={{
                                                backgroundColor: '#1976d2',
                                                color: '#ffffff',
                                                padding: '12px 24px',
                                                fontSize: '16px',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                textTransform: 'none',
                                                fontWeight: '600'
                                            }}
                                        >
                                            Add New Lesson
                                        </Button>
                                    </Box>
                                )}
                                {
                                    IS_STAGING_OR_DEVELOPMENT && <BuildTimeIndicator/>
                                }
                            </center>
                            <Divider/>
                            <Spacer/>
                            <Grid container spacing={3}>
                                {selectionMode === "course"
                                    ? this.coursePlans
                                        .map((course, i) =>
                                            <Grid item xs={12} sm={6} md={4} key={course.courseName}>
                                                <center>
                                                    <Paper className={classes.paper} style={{ position: 'relative' }}>
                                                        {/* Custom course indicator */}
                                                        {course.id && course.id.startsWith('course_') && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: 8,
                                                                right: 8,
                                                                backgroundColor: '#ffc107',
                                                                borderRadius: '50%',
                                                                padding: '4px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                <StarIcon style={{ fontSize: 16, color: '#ffffff' }} />
                                                            </div>
                                                        )}
                                                        <h2 style={{
                                                            marginTop: "5px",
                                                            marginBottom: "10px"
                                                        }}>{course.courseName}</h2>
                                                        <IconButton aria-label={`View Course ${i}`}
                                                            aria-roledescription={`Navigate to course ${i}'s page to view available lessons`}
                                                            role={"link"}
                                                            onClick={() => {
                                                                this.props.history.push(`/courses/${i}`)
                                                            }}>
                                                            <img
                                                                src={`${process.env.PUBLIC_URL}/static/images/icons/folder.png`}
                                                                width="64px"
                                                                alt="folderIcon"/>
                                                        </IconButton>
                                                    </Paper>
                                                </center>
                                            </Grid>
                                        )
                                    : (() => {
                                        const builtInLessons = this.coursePlans[this.props.courseNum].lessons;
                                        const currentCourseName = this.coursePlans[this.props.courseNum].courseName;
                                        const customLessons = getCustomLessonsForCourse(currentCourseName);
                                        const allLessons = [...builtInLessons, ...customLessons];
                                        return allLessons.map((lesson, i) => (
                                            <Grid item xs={12} sm={6} md={4} key={lesson.id || i}>
    <center>
      <Paper className={classes.paper} style={{ position: 'relative' }}>
        {/* top-right “view all problems” button */}
        <IconButton
          size="small"
          style={{ position: 'absolute', top: 8, right: 8 }}
          aria-label={`View all problems for lesson ${lesson.id}`}
          onClick={() => this.props.history.push(`/lessons/${lesson.id}/problems`)}
        >
          <MenuBookIcon fontSize="small" />
        </IconButton>

        <h2 style={{ marginTop: 5, marginBottom: 10 }}>
          {lesson.name.replace(/##/g, "")}
        </h2>
        <h3 style={{ marginTop: 5 }}>{lesson.topics}</h3>

        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={() => {
            console.log('Clicking lesson:', lesson);
            console.log('Lesson ID:', lesson.id);
            this.props.history.push(`/lessons/${lesson.id}/problems`)
          }}
        >
          {translate('lessonSelection.onlyselect')}
        </Button>
      </Paper>
    </center>
  </Grid>
                                        ));
                                    })()
                                }
                            </Grid>
                            <Spacer/>
                        </Box>
                    </Grid>
                    <Spacer/>
                    <Grid container spacing={0}>
                        <Grid item xs={3} sm={3} md={5} key={1}/>
                        {!this.isPrivileged && <Grid item xs={6} sm={6} md={2} key={2}>
                            {this.state.preparedRemoveProgress ?
                                <Button className={classes.button} style={{ width: "100%" }} size="small"
                                    onClick={this.removeProgress}
                                    disabled={this.state.removedProgress}>{this.state.removedProgress ? translate('lessonSelection.reset') : translate('lessonSelection.aresure')}</Button> :
                                <Button className={classes.button} style={{ width: "100%" }} size="small"
                                    onClick={this.prepareRemoveProgress}
                                    disabled={this.state.preparedRemoveProgress}>{translate('lessonSelection.resetprogress')}</Button>}
                        </Grid>}
                        <Grid item xs={3} sm={3} md={4} key={3}/>
                    </Grid>
                    <Spacer/>
                </div>
                <footer>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                        <div style={{ marginLeft: 20, fontSize: 16 }}>
                            {SHOW_COPYRIGHT && <>© {new Date().getFullYear()} {SITE_NAME}</>}
                        </div>
                        <div style={{ display: "flex", flexGrow: 1, marginRight: 20, justifyContent: "flex-end" }}>
                            <IconButton aria-label="about" title={`About ${SITE_NAME}`}
                                onClick={this.togglePopup}>
                                <HelpOutlineOutlinedIcon htmlColor={"#000"} style={{
                                    fontSize: 36,
                                    margin: -2
                                }}/>
                            </IconButton>
                        </div>
                        <Popup isOpen={showPopup} onClose={this.togglePopup}>
                            <About />
                        </Popup>
                    </div>
                </footer>
            </>
        )
    }
}

export default withStyles(styles)(withTranslation(LessonSelection));
