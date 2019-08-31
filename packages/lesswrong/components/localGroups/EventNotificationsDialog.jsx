import React, { useState } from 'react';
import { registerComponent, useUpdate } from 'meteor/vulcan:core';
import withUser from '../common/withUser';
import Users from "meteor/vulcan:users";
import Dialog from '@material-ui/core/Dialog';
import Geosuggest from 'react-geosuggest';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import DialogTitle from '@material-ui/core/DialogTitle';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/lab/Slider';
import { withStyles } from '@material-ui/core/styles';
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import FormLabel from '@material-ui/core/FormLabel';
import Checkbox from '@material-ui/core/Checkbox';
import { geoSuggestStyles } from '../form-components/LocationFormComponent'

const suggestionToGoogleMapsLocation = (suggestion) => {
  return suggestion ? suggestion.gmaps : null
}

const styles = theme => ({
  removeButton: {
    color: theme.palette.error.main,
    marginRight: 'auto',
    marginLeft: -4
  },
  submitButton: {
    color: theme.palette.secondary.main,
    textTransform: 'uppercase'
  },
  actions: {
    marginTop: 24
  },
  geoSuggest: {
    marginTop: 16, 
    marginBottom: 16,
    width: 400,
    ...geoSuggestStyles(theme),
    "& .geosuggest__suggests": {
      top: "100%",
      left: 0,
      right: 0,
      maxHeight: "25em",
      padding: 0,
      marginTop: -1,
      background: "#fff",
      borderTopWidth: 0,
      overflowX: "hidden",
      overflowY: "auto",
      listStyle: "none",
      zIndex: 5,
      transition: "max-height 0.2s, border 0.2s",
    },
    "& .geosuggest__input": {
      border: "2px solid transparent",
      borderBottom: "1px solid rgba(0,0,0,.87)",
      padding: ".5em 1em 0.5em 0em !important",
      width: '100%',
      fontSize: 13,
      [theme.breakpoints.down('sm')]: {
        width: "100%"
      },
    },
  },
  distanceSection: {
    marginTop: 30,
    display: 'flex'
  },
  input: {
    width: '15%',
    marginLeft: '5%',
    position: 'relative',
    top: -12
  },
  slider: {
    width: '80%',
  },
  inputAdornment: {
    marginLeft: 0,
  },
  distanceHeader: {
    marginTop: 20
  },
  peopleThreshold: {
    display: 'flex'
  },
  peopleThresholdText: {
    alignSelf: 'center',
    position: 'relative',
    top: 2
  },
  peopleInput: {
    width: 20
  },
  peopleThresholdCheckbox: {
    marginLeft: -12
  }
})

const EventNotificationsDialog = ({ onClose, currentUser, classes }) => {
  const [ location, setLocation ] = useState(currentUser?.nearbyEventsNotificationsLocation || currentUser?.mapLocation || currentUser?.googleLocation)
  const [ label, setLabel ] = useState(currentUser?.nearbyEventsNotificationsLocation?.formatted_address || currentUser?.mapLocation?.formatted_address || currentUser?.googleLocation?.formatted_address)
  const [ distance, setDistance ] = useState(currentUser?.nearbyEventsNotificationsRadius || 50)
  const [ notifyPeopleThreshold, setNotifyPeopleThreshold ] = useState(currentUser?.nearbyPeopleNotificationThreshold || 10)
  const [ notifyPeopleCheckboxState, setNotifyPeopleCheckboxState ] = useState(!!currentUser?.nearbyPeopleNotificationThreshold)
  const { mutate } = useUpdate({
    collection: Users,
    fragmentName: 'UsersCurrent',
  })

  const peopleThresholdInput = <Input
    className={classes.peopleInput}
    value={notifyPeopleThreshold}
    margin="dense"
    onChange={(e) => setNotifyPeopleThreshold(e.target.value)}
  />

  return (
    <Dialog
      modal={false}
      open={true}
      onClose={onClose}
    >
      <DialogTitle>
        Notifying you of nearby events and new groups
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Notify me for events and new groups in this location
        </Typography>
        <div className={classes.geoSuggest}>
          <Geosuggest
            placeholder="Location"
            onSuggestSelect={(suggestion) => { 
              setLocation(suggestionToGoogleMapsLocation(suggestion))
              setLabel(suggestion?.label)
            }}
            initialValue={label}
          />
        </div>
        <FormLabel className={classes.distanceHeader} component="legend">Notification Radius</FormLabel>
        <div className={classes.distanceSection}>
          <Slider
            className={classes.slider}
            value={distance}
            step={5}
            min={0}
            max={300}
            onChange={(e, value) => setDistance(value)}
            aria-labelledby="input-slider"
          />
          <Input
            className={classes.input}
            value={distance}
            margin="dense"
            onChange={(e) => setDistance(e.target.value)}
            endAdornment={<InputAdornment disableTypography className={classes.inputAdornment} position="end">km</InputAdornment>}
            onBlur={() => setDistance(distance > 1000 ? 1000 : (distance < 0 ? 0 : distance))}
            inputProps={{
              step: 10,
              min: 0,
              max: 1000,
              type: 'number',
              'aria-labelledby': 'input-slider',
            }}
          />
        </div>
        <div className={classes.peopleThreshold}>
          <div>
            <Checkbox
              className={classes.peopleThresholdCheckbox}
              checked={notifyPeopleCheckboxState}
              onChange={(e) => setNotifyPeopleCheckboxState(!!e.target.checked)}
            />
          </div>
          <div className={classes.peopleThresholdText}>
            Notify me when there are {peopleThresholdInput} or more people in my area
          </div>
        </div>
        <DialogActions className={classes.actions}>
          {currentUser?.nearbyEventsNotifications && <a className={classes.removeButton} onClick={()=>{
            mutate({selector: {_id: currentUser._id}, data: {
              nearbyEventsNotifications: false,
              nearbyEventsNotificationsLocation: null, 
              nearbyEventsNotificationsRadius: null, 
              nearbyPeopleNotificationThreshold: null,
            }})
            onClose()
          }}>
            Stop notifying me
          </a>}
          <a className={classes.submitButton} onClick={()=>{
            mutate({selector: {_id: currentUser._id}, data: {
              nearbyEventsNotifications: true,
              nearbyEventsNotificationsLocation: location, 
              nearbyEventsNotificationsRadius: distance, 
              nearbyPeopleNotificationThreshold: notifyPeopleCheckboxState ? notifyPeopleThreshold : null,
            }})
            onClose()
          }}>
            Submit
          </a>
        </DialogActions>
      </DialogContent>
    </Dialog>
  )
}

registerComponent('EventNotificationsDialog', EventNotificationsDialog, withUser, withStyles(styles, {name: "EventNotificationsDialog"}) );
